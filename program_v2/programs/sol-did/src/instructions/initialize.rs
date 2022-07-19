use crate::constants::DID_ACCOUNT_SEED;
use crate::errors::DidSolError;
use crate::state::{DidAccount, VerificationMethod, VerificationMethodFlags};
use anchor_lang::prelude::*;

pub fn initialize(ctx: Context<Initialize>, size: u32) -> Result<()> {
    require!(
        usize::try_from(size).unwrap() >= DidAccount::initial_size() + 8,
        DidSolError::InsufficientInitialSize
    );

    let did_data = &mut ctx.accounts.did_data;
    did_data.version = 0;
    did_data.bump = *ctx.bumps.get("did_data").unwrap();
    did_data.nonce = 0;

    did_data.initial_verification_method = VerificationMethod::default(
        VerificationMethodFlags::CAPABILITY_INVOCATION | VerificationMethodFlags::OWNERSHIP_PROOF,
        ctx.accounts.authority.key().to_bytes().to_vec(),
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(size: u32)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = usize::try_from(size).unwrap(),
        seeds = [DID_ACCOUNT_SEED.as_bytes(), authority.key().as_ref()],
        bump )]
    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
