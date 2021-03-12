//! Program instructions

use {
    crate::{
        id,
        state::{ClusterType, SolidData},
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
pub enum SolidInstruction {
    /// Create a new solid
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable, signer]` Funding account, must be a system account
    /// 1. `[writable]` Unallocated Solid account, must be a program address
    /// 2. `[]` Solid authority
    /// 3. `[]` Rent sysvar
    /// 4. `[]` System program
    Initialize {
        /// Identifier for the cluster, added to the DID if present.  For example,
        /// if we set this to "devnet", the DID becomes: "did:solid:devnet:<pubkey>"
        cluster_type: ClusterType,
        /// Size of the DID document
        size: u64,
        /// Additional data to write into the document
        init_data: SolidData,
    },

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

    /// Close the provided solid account, draining lamports to recipient account
    ///
    /// Accounts expected by this instruction:
    ///
    /// 0. `[writable]` Solid account, must be previously initialized
    /// 1. `[signer]` Solid authority
    /// 2. `[]` Receiver of account lamports
    CloseAccount,
}

/// Get program-derived solid address for the authority
pub fn get_solid_address_with_seed(authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&authority.to_bytes(), br"solid"], &id())
}

/// Create a `SolidInstruction::Initialize` instruction
pub fn initialize(
    funder_account: &Pubkey,
    authority: &Pubkey,
    cluster_type: ClusterType,
    size: u64,
    init_data: SolidData,
) -> Instruction {
    let (solid_account, _) = get_solid_address_with_seed(authority);
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::Initialize {
            cluster_type,
            size,
            init_data,
        },
        vec![
            AccountMeta::new(*funder_account, true),
            AccountMeta::new(solid_account, false),
            AccountMeta::new_readonly(*authority, false),
            AccountMeta::new_readonly(sysvar::rent::id(), false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    )
}

/// Create a `SolidInstruction::Write` instruction
pub fn write(
    solid_account: &Pubkey,
    authority: &Pubkey,
    offset: u64,
    data: Vec<u8>,
) -> Instruction {
    Instruction::new_with_borsh(
        id(),
        &SolidInstruction::Write { offset, data },
        vec![
            AccountMeta::new(*solid_account, false),
            AccountMeta::new_readonly(*authority, true),
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
        let cluster_type = ClusterType::Development;
        let size = 1_000u64;
        let init_data = test_solid_data();
        let mut expected = vec![0, 3];
        expected.extend_from_slice(&size.to_le_bytes());
        expected.append(&mut init_data.try_to_vec().unwrap());
        let instruction = SolidInstruction::Initialize {
            cluster_type,
            size,
            init_data,
        };
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
    fn serialize_close_account() {
        let instruction = SolidInstruction::CloseAccount;
        let expected = vec![2];
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
