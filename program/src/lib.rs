//! SOLID program
#![deny(missing_docs)]

pub mod borsh;
mod entrypoint;
pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

// Export current SDK types for downstream users building with a different SDK version
pub use solana_program;

solana_program::declare_id!("ide3Y2TubNMLLhiG1kDL6to4a8SjxD18YWCYC5BZqNV");
