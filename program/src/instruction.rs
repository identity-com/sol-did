//! Program instructions

use {
    crate::id,
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
    },
};

/// Instructions supported by the program
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum SolidInstruction {
    /// Create a new solid
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Solid account, must be uninitialized
    /// 1. `[]` Solid authority
    Initialize,

    /// Write to the provided solid account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Solid account, must be previously initialized
    /// 1. `[signer]` Current solid authority
    Write {
        /// Offset to start writing record, expressed as `u64`.
        offset: u64,
        /// Data to replace the existing record data
        data: Vec<u8>,
    },

    /// Update the authority of the provided solid account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Solid account, must be previously initialized
    /// 1. `[signer]` Current solid authority
    /// 2. `[]` New solid authority
    SetAuthority,

    /// Close the provided solid account, draining lamports to recipient account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Solid account, must be previously initialized
    /// 1. `[signer]` Solid authority
    /// 2. `[]` Receiver of account lamports
    CloseAccount,
}

/// Create a `SolidInstruction::Initialize` instruction
pub fn initialize(solid_account: &Pubkey, authority: &Pubkey) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::Initialize,
        vec![
            AccountMeta::new(*solid_account, false),
            AccountMeta::new_readonly(*authority, false),
        ],
    )
}

/// Create a `SolidInstruction::Write` instruction
pub fn write(solid_account: &Pubkey, authority: &Pubkey, offset: u64, data: Vec<u8>) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::Write { offset, data },
        vec![
            AccountMeta::new(*solid_account, false),
            AccountMeta::new_readonly(*authority, true),
        ],
    )
}

/// Create a `SolidInstruction::SetAuthority` instruction
pub fn set_authority(
    solid_account: &Pubkey,
    authority: &Pubkey,
    new_authority: &Pubkey,
) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::SetAuthority,
        vec![
            AccountMeta::new(*solid_account, false),
            AccountMeta::new_readonly(*authority, true),
            AccountMeta::new_readonly(*new_authority, false),
        ],
    )
}

/// Create a `SolidInstruction::CloseAccount` instruction
pub fn close_account(solid_account: &Pubkey, authority: &Pubkey, receiver: &Pubkey) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::CloseAccount,
        vec![
            AccountMeta::new(*solid_account, false),
            AccountMeta::new_readonly(*authority, true),
            AccountMeta::new(*receiver, false),
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::tests::test_solid_data;
    use solana_program::program_error::ProgramError;

    #[test]
    fn serialize_initialize() {
        let instruction = SolidInstruction::Initialize;
        let expected = vec![0];
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolidInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn serialize_write() {
        let data = test_solid_data().try_to_vec().unwrap();
        let offset = 0u64;
        let instruction = SolidInstruction::Write {
            offset: 0,
            data: data.clone(),
        };
        let mut expected = vec![1];
        expected.extend_from_slice(&offset.to_le_bytes());
        expected.append(&mut data.try_to_vec().unwrap());
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolidInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn serialize_set_authority() {
        let instruction = SolidInstruction::SetAuthority;
        let expected = vec![2];
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolidInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn serialize_close_account() {
        let instruction = SolidInstruction::CloseAccount;
        let expected = vec![3];
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolidInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn deserialize_invalid_instruction() {
        let expected = vec![12];
        let err: ProgramError = SolidInstruction::try_from_slice(&expected)
            .unwrap_err()
            .into();
        assert!(matches!(err, ProgramError::BorshIoError(_)));
    }
}
