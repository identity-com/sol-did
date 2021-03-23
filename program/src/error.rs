//! Error types

use {
    num_derive::FromPrimitive,
    solana_program::{
        decode_error::DecodeError, program_error::ProgramError, pubkey::ParsePubkeyError,
    },
    thiserror::Error,
};

/// Errors that may be returned by the program.
#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum SolidError {
    /// Incorrect authority provided on update or delete
    #[error("Incorrect authority provided on update or delete")]
    IncorrectAuthority,

    /// Calculation overflow
    #[error("Calculation overflow")]
    Overflow,

    /// Invalid string error, from parsing
    #[error("Invalid string")]
    InvalidString,

    /// Incorrect program: The account passed is not owned by the Solid program
    #[error("Incorrect program")]
    IncorrectProgram,
}
impl From<SolidError> for ProgramError {
    fn from(e: SolidError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl From<ParsePubkeyError> for SolidError {
    fn from(_e: ParsePubkeyError) -> Self {
        SolidError::InvalidString
    }
}
impl<T> DecodeError<T> for SolidError {
    fn type_of() -> &'static str {
        "Solid Error"
    }
}
