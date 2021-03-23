//! SOLID program
#![deny(missing_docs)]

use {
    crate::{borsh as program_borsh, error::SolidError, processor::is_authority, state::SolidData},
    solana_program::{account_info::AccountInfo, entrypoint::ProgramResult},
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
pub fn validate_owner(did: &AccountInfo, signers: &[AccountInfo]) -> ProgramResult {
    if did.owner.ne(&id()) {
        return Err(SolidError::IncorrectProgram.into());
    }
    let solid = program_borsh::try_from_slice_incomplete::<SolidData>(*did.data.borrow())?;

    if signers
        .iter()
        .any(|s| s.is_signer && is_authority(s, &solid))
    {
        Ok(())
    } else {
        Err(SolidError::IncorrectAuthority.into())
    }
}
