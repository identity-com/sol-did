//! Program state processor

use {
    crate::{
        borsh as program_borsh,
        error::SolidError,
        id,
        instruction::{get_solid_address_with_seed, SolidInstruction},
        state::{DistributedId, SolidData},
    },
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        program::invoke_signed,
        program_error::ProgramError,
        program_pack::IsInitialized,
        pubkey::Pubkey,
        rent::Rent,
        system_instruction,
        sysvar::Sysvar,
    },
};

fn check_authority(authority_info: &AccountInfo, solid: &SolidData) -> ProgramResult {
    if !authority_info.is_signer {
        msg!("Solid authority signature missing");
        return Err(ProgramError::MissingRequiredSignature);
    }
    if solid
        .write_authorized_pubkeys()
        .iter()
        .any(|v| v == authority_info.key)
    {
        Ok(())
    } else {
        msg!("Incorrect Solid authority provided");
        Err(SolidError::IncorrectAuthority.into())
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
        SolidInstruction::Initialize { cluster_type } => {
            msg!("SolidInstruction::Initialize");

            let funder_info = next_account_info(account_info_iter)?;
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let rent_info = next_account_info(account_info_iter)?;
            let system_program_info = next_account_info(account_info_iter)?;
            let rent = &Rent::from_account_info(rent_info)?;

            let (solid_address, solid_bump_seed) = get_solid_address_with_seed(authority_info.key);
            if solid_address != *data_info.key {
                msg!("Error: solid address derivation mismatch");
                return Err(ProgramError::InvalidArgument);
            }

            let data_len = data_info.data.borrow().len();
            if data_len > 0 {
                msg!("Solid account already initialized");
                return Err(ProgramError::AccountAlreadyInitialized);
            }

            let solid_signer_seeds: &[&[_]] = &[
                &authority_info.key.to_bytes(),
                br"solid",
                &[solid_bump_seed],
            ];

            msg!("Creating data account");
            invoke_signed(
                &system_instruction::create_account(
                    funder_info.key,
                    data_info.key,
                    1.max(rent.minimum_balance(SolidData::LEN)),
                    SolidData::LEN as u64,
                    &id(),
                ),
                &[
                    funder_info.clone(),
                    data_info.clone(),
                    system_program_info.clone(),
                ],
                &[&solid_signer_seeds],
            )?;

            let did = DistributedId::new(cluster_type, *data_info.key);
            let solid = SolidData::new_sparse(did, *authority_info.key);
            solid
                .serialize(&mut *data_info.data.borrow_mut())
                .map_err(|e| e.into())
        }

        SolidInstruction::Write { offset, data } => {
            msg!("SolidInstruction::Write");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let account_data =
                program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Solid account not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data)?;
            let start = offset as usize;
            let end = start + data.len();
            if end > data_info.data.borrow().len() {
                return Err(ProgramError::AccountDataTooSmall);
            } else {
                data_info.data.borrow_mut()[start..end].copy_from_slice(&data);
            }

            // make sure the written bytes are valid by trying to deserialize
            // the update account buffer
            let _account_data =
                program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            Ok(())
        }

        SolidInstruction::CloseAccount => {
            msg!("SolidInstruction::CloseAccount");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let destination_info = next_account_info(account_info_iter)?;
            let account_data =
                program_borsh::try_from_slice_incomplete::<SolidData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Solid not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data)?;
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
