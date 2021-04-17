//! Program instructions

use {
    crate::{
        id,
        state::{get_sol_address_with_seed, SolData},
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        system_program, sysvar,
    },
};

/// Instructions supported by the program
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum SolInstruction {
    /// Create a new sol
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable, signer]` Funding account, must be a system account
    /// 1. `[writable]` Unallocated Sol account, must be a program address
    /// 2. `[]` Sol authority
    /// 3. `[]` Rent sysvar
    /// 4. `[]` System program
    Initialize {
        /// Size of the DID document
        size: u64,
        /// Additional data to write into the document
        init_data: SolData,
    },

    /// Write to the provided sol account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Sol account, must be previously initialized
    /// 1. `[signer]` Current sol authority
    Write {
        /// Offset to start writing record, expressed as `u64`.
        offset: u64,
        /// Data to replace the existing record data
        data: Vec<u8>,
    },

    /// Close the provided sol account, draining lamports to recipient account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Sol account, must be previously initialized
    /// 1. `[signer]` Sol authority
    /// 2. `[]` Receiver of account lamports
    CloseAccount,
}

/// Create a `SolInstruction::Initialize` instruction
pub fn initialize(
    funder_account: &Pubkey,
    authority: &Pubkey,
    size: u64,
    init_data: SolData,
) -> Instruction {
    let (sol_account, _) = get_sol_address_with_seed(authority);
    Instruction::new_with_borsh(
        id(),
        &SolInstruction::Initialize { size, init_data },
        vec![
            AccountMeta::new(*funder_account, true),
            AccountMeta::new(sol_account, false),
            AccountMeta::new_readonly(*authority, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    )
}

/// Create a `SolInstruction::Write` instruction
pub fn write(sol_account: &Pubkey, authority: &Pubkey, offset: u64, data: Vec<u8>) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolInstruction::Write { offset, data },
        vec![
            AccountMeta::new(*sol_account, false),
            AccountMeta::new_readonly(*authority, true),
        ],
    )
}

/// Create a `SolInstruction::CloseAccount` instruction
pub fn close_account(sol_account: &Pubkey, authority: &Pubkey, receiver: &Pubkey) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolInstruction::CloseAccount,
        vec![
            AccountMeta::new(*sol_account, false),
            AccountMeta::new_readonly(*authority, true),
            AccountMeta::new(*receiver, false),
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::tests::test_sol_data;
    use solana_program::program_error::ProgramError;

    #[test]
    fn serialize_initialize() {
        let size = SolData::DEFAULT_SIZE as u64;
        let init_data = test_sol_data();
        let mut expected = vec![0];
        expected.extend_from_slice(&size.to_le_bytes());
        expected.append(&mut init_data.try_to_vec().unwrap());
        let instruction = SolInstruction::Initialize { size, init_data };
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn serialize_write() {
        let data = test_sol_data().try_to_vec().unwrap();
        let offset = 0u64;
        let instruction = SolInstruction::Write {
            offset: 0,
            data: data.clone(),
        };
        let mut expected = vec![1];
        expected.extend_from_slice(&offset.to_le_bytes());
        expected.append(&mut data.try_to_vec().unwrap());
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn serialize_close_account() {
        let instruction = SolInstruction::CloseAccount;
        let expected = vec![2];
        assert_eq!(instruction.try_to_vec().unwrap(), expected);
        assert_eq!(
            SolInstruction::try_from_slice(&expected).unwrap(),
            instruction
        );
    }

    #[test]
    fn deserialize_invalid_instruction() {
        let expected = vec![12];
        let err: ProgramError = SolInstruction::try_from_slice(&expected)
            .unwrap_err()
            .into();
        assert!(matches!(err, ProgramError::BorshIoError(_)));
    }
}
