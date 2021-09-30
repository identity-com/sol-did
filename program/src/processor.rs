//! Program state processor

use {
    crate::{
        borsh as program_borsh,
        error::SolError,
        id,
        instruction::SolInstruction,
        state::{get_sol_address_with_seed, SolData},
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

/// Checks if the authority account is an authority for the DID
/// True iff:
/// - the key is equal to the Authority field AND
/// - the capability_invocation property is not overridden
/// OR
/// - the key is listed in the verification_methods AND
/// - the key is referred to in the capability_invocation property.
pub fn is_authority(authority_info: &AccountInfo, sol: &SolData) -> bool {
    sol.write_authorized_pubkeys()
        .iter()
        .any(|v| v == authority_info.key)
}

fn check_authority(authority_info: &AccountInfo, sol: &SolData) -> ProgramResult {
    if !authority_info.is_signer {
        msg!("Sol authority signature missing");
        return Err(ProgramError::MissingRequiredSignature);
    }
    if is_authority(authority_info, sol) {
        Ok(())
    } else {
        msg!("Incorrect Sol authority provided");
        Err(SolError::IncorrectAuthority.into())
    }
}

/// Instruction processor
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction = SolInstruction::try_from_slice(input)?;
    let account_info_iter = &mut accounts.iter();

    match instruction {
        SolInstruction::Initialize { size, init_data } => {
            msg!("SolInstruction::Initialize");

            let funder_info = next_account_info(account_info_iter)?;
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let rent_info = next_account_info(account_info_iter)?;
            let system_program_info = next_account_info(account_info_iter)?;
            let rent = &Rent::from_account_info(rent_info)?;

            let (sol_address, sol_bump_seed) = get_sol_address_with_seed(authority_info.key);
            if sol_address != *data_info.key {
                msg!("Error: sol address derivation mismatch");
                return Err(ProgramError::InvalidArgument);
            }

            let data_len = data_info.data.borrow().len();
            if data_len > 0 {
                msg!("Sol account already initialized");
                return Err(ProgramError::AccountAlreadyInitialized);
            }

            let sol_signer_seeds: &[&[_]] =
                &[&authority_info.key.to_bytes(), br"sol", &[sol_bump_seed]];

            msg!("Creating data account");
            invoke_signed(
                &system_instruction::create_account(
                    funder_info.key,
                    data_info.key,
                    1.max(rent.minimum_balance(size as usize)),
                    size,
                    &id(),
                ),
                &[
                    funder_info.clone(),
                    data_info.clone(),
                    system_program_info.clone(),
                ],
                &[&sol_signer_seeds],
            )?;

            let mut sol = SolData::new_sparse(*authority_info.key);
            sol.merge(init_data);
            BorshSerialize::serialize(&sol, &mut *data_info.data.borrow_mut()).map_err(|e| e.into())
        }

        SolInstruction::Write { offset, data } => {
            msg!("SolInstruction::Write");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let account_data =
                program_borsh::try_from_slice_incomplete::<SolData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Sol account not initialized");
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
                program_borsh::try_from_slice_incomplete::<SolData>(*data_info.data.borrow())?;
            Ok(())
        }

        SolInstruction::CloseAccount => {
            msg!("SolInstruction::CloseAccount");
            let data_info = next_account_info(account_info_iter)?;
            let authority_info = next_account_info(account_info_iter)?;
            let destination_info = next_account_info(account_info_iter)?;
            let account_data =
                program_borsh::try_from_slice_incomplete::<SolData>(*data_info.data.borrow())?;
            if !account_data.is_initialized() {
                msg!("Sol not initialized");
                return Err(ProgramError::UninitializedAccount);
            }
            check_authority(authority_info, &account_data)?;
            let destination_starting_lamports = destination_info.lamports();
            let data_lamports = data_info.lamports();
            **data_info.lamports.borrow_mut() = 0;
            **destination_info.lamports.borrow_mut() = destination_starting_lamports
                .checked_add(data_lamports)
                .ok_or(SolError::Overflow)?;
            Ok(())
        }
    }
}
