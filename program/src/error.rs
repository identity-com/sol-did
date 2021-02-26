//! Error types

use num_derive::FromPrimitive;
use solana_program::{decode_error::DecodeError, program_error::ProgramError};
use thiserror::Error;

/// Errors that may be returned by the program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum SolidError {
    /// Incorrect authority provided on update or delete
    #[error("Incorrect authority provided on update or delete")]
    IncorrectAuthority,

    /// Calculation overflow
    #[error("Calculation overflow")]
    Overflow,
}
impl From<SolidError> for ProgramError {
    fn from(e: SolidError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl<T> DecodeError<T> for SolidError {
    fn type_of() -> &'static str {
        "Solid Error"
    }
}
