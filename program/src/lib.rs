//! SOL program
#![deny(missing_docs)]

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

solana_program::declare_id!("ide3Y2TubNMLLhiG1kDL6to4a8SjxD18YWCYC5BZqNV");

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
    controller_accounts: &[&AccountInfo<'a>],
) -> ProgramResult {
    let mut verify_pda = did_pda;
    // Go up the controller chain starting with the did pda
    for controller_account in controller_accounts {
        if verify_pda.owner != &id() {
            // Generative does not have a controller
            return Err(ProgramError::IncorrectProgramId);
        }
        let sol = program_borsh::try_from_slice_incomplete::<SolData>(*verify_pda.data.borrow())?;
        // Check if pda of controller is the next controller account
        if sol
            .controller
            .iter()
            .map(get_sol_address_with_seed)
            .any(|(controller_pda, _)| &controller_pda == controller_account.key)
        {
            return Err(SolError::IncorrectController.into());
        }
        verify_pda = *controller_account;
    }
    if verify_pda.owner == &id() {
        // Normal case

        // Grab the did data
        let sol = program_borsh::try_from_slice_incomplete::<SolData>(*verify_pda.data.borrow())?;

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
