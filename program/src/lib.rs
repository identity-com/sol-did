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

solana_program::declare_id!("idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM");

/// Given a DID, validate that the signers contain at least one
/// account that has permissions to sign transactions using the DID.
///
/// - `did`: The did pda account
/// - `signers`: The list of signers to check
pub fn validate_owner(did: &AccountInfo, signers: &[&AccountInfo]) -> ProgramResult {
    if did.owner == &id() {
        // Normal case

        // Grab the did data
        let sol = program_borsh::try_from_slice_incomplete::<SolData>(*did.data.borrow())?;

        // check if any accounts from `signers` are an authority on the did and signed
        if signers.iter().any(|s| s.is_signer && is_authority(s, &sol)) {
            Ok(())
        } else {
            Err(SolError::IncorrectAuthority.into())
        }
    } else if did.owner == &system_program::id() {
        // Generative case
        if !did.data_is_empty() {
            // Data must be empty, otherwise we can't put a did there
            // This case shouldn't happen in the current incarnation but if it does we don't want it to break things
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        // Find an account within `signers` that is the authority (the key of the did)
        match signers
            .iter()
            .find(|signer| &get_sol_address_with_seed(signer.key).0 == did.key)
        {
            None => Err(ProgramError::InvalidArgument),
            Some(authority) => {
                // Found authority in signers list
                if authority.is_signer {
                    // Authority is signer
                    Ok(())
                } else {
                    // Authority is not signer
                    Err(ProgramError::MissingRequiredSignature)
                }
            }
        }
    } else {
        // Unknown owner
        Err(ProgramError::IncorrectProgramId)
    }
}
