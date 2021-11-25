//! SOL program
#![deny(missing_docs)]

use std::borrow::Cow;
use {
    crate::{
        borsh as program_borsh,
        error::SolError,
        processor::is_authority,
        state::{get_sol_address_with_seed, SolData},
    },
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, program_error::ProgramError,
        system_program,
    },
};

pub mod borsh;
mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

// Export current SDK types for downstream users building with a different SDK version

pub use solana_program;

solana_program::declare_id!("idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM");

/// Given a DID, validate that the signers contain at least one
/// account that has permissions to sign transactions using the DID.
///
/// - `did`: The did pda account
/// - `signer`: The signer to check
/// - `controller_accounts`: accounts to travel up to the controller. Order is as follows:
///   - `A` controls `B`, `B` controls `C`
///   - `A` is signing for `C`
///   - `did_pda` is `C`'s PDA
///   - `controller_accounts` is \[`B`'s PDA, `C`'s PDA]
pub fn validate_owner<'a>(
    did_pda: &AccountInfo<'a>,
    signer: &AccountInfo,
    controller_accounts: impl Iterator<Item = Cow<'a, AccountInfo<'a>>>,
) -> ProgramResult {
    let mut verify_pda = Cow::Borrowed(did_pda);
    // Go up the controller chain starting with the did pda
    for controller_account in controller_accounts {
        if verify_pda.owner != &id() {
            // Generative does not have a controller
            return Err(ProgramError::IncorrectProgramId);
        }
        let sol = program_borsh::try_from_slice_incomplete::<SolData>(*verify_pda.data.borrow())?;
        assert_eq!(sol.account_version, SolData::VALID_ACCOUNT_VERSION);
        // Check if pda of controller is the next controller account
        if !sol
            .controller
            .iter()
            .map(get_sol_address_with_seed)
            .any(|(controller_pda, _)| &controller_pda == controller_account.key)
        {
            return Err(SolError::IncorrectController.into());
        }
        verify_pda = controller_account;
    }
    if verify_pda.owner == &id() {
        // Normal case

        // Grab the did data
        let sol = program_borsh::try_from_slice_incomplete::<SolData>(*verify_pda.data.borrow())?;
        assert_eq!(sol.account_version, SolData::VALID_ACCOUNT_VERSION);

        // Checks if `signer` is signer and is authority
        if signer.is_signer && is_authority(signer, &sol) {
            Ok(())
        } else {
            Err(SolError::IncorrectAuthority.into())
        }
    } else if verify_pda.owner == &system_program::id() {
        // Generative case
        if !verify_pda.data_is_empty() {
            // Data must be empty, otherwise we can't put a did there
            // This case shouldn't happen in the current incarnation but if it does we don't want it to break things
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        // Find an account within `signers` that is the authority (the key of the did)
        if &get_sol_address_with_seed(signer.key).0 == verify_pda.key {
            // `signer` is authority
            if signer.is_signer {
                // `signer` is signer
                Ok(())
            } else {
                // `signer` is not signer
                Err(ProgramError::MissingRequiredSignature)
            }
        } else {
            // `signer` is not authority
            Err(ProgramError::InvalidArgument)
        }
    } else {
        // Unknown owner
        Err(ProgramError::IncorrectProgramId)
    }
}

#[cfg(test)]
mod test {
    use crate::state::{get_sol_address_with_seed, SolData, VerificationMethod};
    use crate::{id, validate_owner};
    use borsh::BorshSerialize;
    use rand::SeedableRng;
    use rand_chacha::ChaCha20Rng;
    use solana_program::account_info::AccountInfo;
    use solana_sdk::rent::Rent;
    use solana_sdk::signature::{Keypair, Signer};
    use std::borrow::Cow;
    use std::cell::RefCell;
    use std::error::Error;
    use std::rc::Rc;

    #[test]
    fn controller_test() -> Result<(), Box<dyn Error>> {
        let mut rng = ChaCha20Rng::from_entropy();
        for i in 1..11 {
            let mut did_data = SolData::rand_data(&mut rng);
            let mut controller_data = (0..i)
                .map(|_| SolData::rand_data(&mut rng))
                .collect::<Vec<_>>();

            let signing_key = Keypair::generate(&mut rng);
            let last = controller_data.last_mut().unwrap();
            last.authority = signing_key.pubkey();
            last.verification_method.push(VerificationMethod {
                id: "signer".to_string(),
                verification_type: VerificationMethod::DEFAULT_TYPE.to_string(),
                pubkey: signing_key.pubkey(),
            });
            last.capability_invocation.push("signer".to_string());

            let mut last_authority = None;
            for data in controller_data.iter_mut().rev() {
                if let Some(last_authority) = last_authority {
                    data.controller = vec![last_authority];
                }
                last_authority = Some(data.authority);
            }
            if let Some(last_authority) = last_authority {
                did_data.controller = vec![last_authority];
            }

            let program_id = id();
            let did_key = get_sol_address_with_seed(&did_data.authority).0;
            let mut did_data_bytes = BorshSerialize::try_to_vec(&did_data)?;
            let mut did_lamports = Rent::default().minimum_balance(did_data_bytes.len());
            let did_account = AccountInfo {
                key: &did_key,
                is_signer: false,
                is_writable: false,
                lamports: Rc::new(RefCell::new(&mut did_lamports)),
                data: Rc::new(RefCell::new(&mut did_data_bytes)),
                owner: &program_id,
                executable: false,
                rent_epoch: 0,
            };

            let controller_keys = controller_data
                .iter()
                .map(|controller_data| get_sol_address_with_seed(&controller_data.authority).0)
                .collect::<Vec<_>>();
            let mut controller_data_bytes = controller_data
                .iter()
                .map(|controller_data| BorshSerialize::try_to_vec(controller_data))
                .collect::<Result<Vec<_>, _>>()?;
            let mut controller_lamports = controller_data_bytes
                .iter()
                .map(|bytes| Rent::default().minimum_balance(bytes.len()))
                .collect::<Vec<_>>();
            let controller_accounts = controller_keys
                .iter()
                .zip(controller_data_bytes.iter_mut())
                .zip(controller_lamports.iter_mut())
                .map(|((key, bytes), lamports)| AccountInfo {
                    key,
                    is_signer: false,
                    is_writable: false,
                    lamports: Rc::new(RefCell::new(lamports)),
                    data: Rc::new(RefCell::new(bytes)),
                    owner: &program_id,
                    executable: false,
                    rent_epoch: 0,
                });
            let signing_pubkey = signing_key.pubkey();
            let mut signer_lamports = 0;
            let mut signer_data = [];
            let system_program_id = solana_sdk::system_program::id();
            let signer = AccountInfo {
                key: &signing_pubkey,
                is_signer: true,
                is_writable: false,
                lamports: Rc::new(RefCell::new(&mut signer_lamports)),
                data: Rc::new(RefCell::new(&mut signer_data)),
                owner: &system_program_id,
                executable: false,
                rent_epoch: 0,
            };

            assert_eq!(
                validate_owner(&did_account, &signer, controller_accounts.map(Cow::Owned)),
                Ok(())
            );
        }

        Ok(())
    }
}
