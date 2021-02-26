//! Program state processor

use {
    crate::{
        borsh as program_borsh,
        error::SolidError,
        instruction::SolidInstruction,
        state::{DistributedId, VerificationMethod, SolidData},
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program_error::ProgramError,
        program_pack::IsInitialized,
        pubkey::Pubkey,
    },
};

fn check_authority(authority_info: &AccountInfo, verification_methods: &Vec<VerificationMethod>) -> ProgramResult {
    if !authority_info.is_signer {
        msg!("Solid authority signature missing");
        return Err(ProgramError::MissingRequiredSignature);
    }
    if verification_methods.iter().any(|v| &v.pubkey == authority_info.key) {
        Ok(())
    } else {
        msg!("Incorrect Solid authority provided");
        return Err(SolidError::IncorrectAuthority.into());
    }
}

/// Instruction processor
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction = SolidInstruction::try_from_slice(input)?;
    let account_info_iter = &mut accounts.iter();

    match instruction {
        SolidInstruction::Initialize => {
            msg!("SolidInstruction::Initialize");

            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;

            let account_data = program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if account_data.is_initialized() {
                msg!("Solid account already initialized");
                return Err(ProgramError::AccountAlreadyInitialized);
            }

            let did = DistributedId::from(*data_info.key);
            let solid = SolidData::new(did, *authority_info.key);
            solid
                .serialize(&mut *data_info.data.borrow_mut())
                .map_err(|e| e.into())
        }

        SolidInstruction::Write { offset, data } => {
            msg!("SolidInstruction::Write");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let account_data = program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Solid account not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data.public_key)?;
            let start = offset as usize;
            let end = start + data.len();
            if end > data_info.data.borrow().len() {
                Err(ProgramError::AccountDataTooSmall)
            } else {
                data_info.data.borrow_mut()[start..end].copy_from_slice(&data);
                Ok(())
            }
        }

        SolidInstruction::SetAuthority => {
            msg!("SolidInstruction::SetAuthority");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let new_authority_info = next_account_info(account_info_iter)?;
            let mut account_data = program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Solid account not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data.public_key)?;
            let did = DistributedId::from(*data_info.key);
            account_data.public_key = vec![VerificationMethod::new(did, *new_authority_info.key)];
            account_data
                .serialize(&mut *data_info.data.borrow_mut())
                .map_err(|e| e.into())
        }

        SolidInstruction::CloseAccount => {
            msg!("SolidInstruction::CloseAccount");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let destination_info = next_account_info(account_info_iter)?;
            let account_data = program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Solid not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data.public_key)?;
            let destination_starting_lamports = destination_info.lamports();
            let data_lamports = data_info.lamports();
            **data_info.lamports.borrow_mut() = 0;
            **destination_info.lamports.borrow_mut() = destination_starting_lamports
                .checked_add(data_lamports)
                .ok_or(SolidError::Overflow)?;
            Ok(())
        }
    }
}
