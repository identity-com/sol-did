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
pub enum SolError {
    /// Incorrect authority provided on update or delete
    #[error("Incorrect authority provided on update or delete")]
    IncorrectAuthority,

    /// Calculation overflow
    #[error("Calculation overflow")]
    Overflow,

    /// Invalid string error, from parsing
    #[error("Invalid string")]
    InvalidString,
}
impl From<SolError> for ProgramError {
    fn from(e: SolError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
impl From<ParsePubkeyError> for SolError {
    fn from(_e: ParsePubkeyError) -> Self {
        SolError::InvalidString
    }
}
impl<T> DecodeError<T> for SolError {
    fn type_of() -> &'static str {
        "Sol Error"
    }
}
