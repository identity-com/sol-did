use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, VerificationMethod, VerificationMethodFlags};
use anchor_lang::prelude::*;

pub fn initialize(ctx: Context<Initialize>, _size: Option<u32>) -> Result<()> {
    let did_data = &mut ctx.accounts.did_data;
    did_data.version = 0;
    did_data.bump = *ctx.bumps.get("did_data").unwrap();
    did_data.nonce = 0;

    did_data.initial_verification_method = VerificationMethod::default(
        VerificationMethodFlags::CAPABILITY_INVOCATION | VerificationMethodFlags::OWNERSHIP_PROOF,
        ctx.accounts.authority.key().to_bytes().to_vec(),
    );

    msg!("Successfully initialized DID account.");
    Ok(())
}

#[derive(Accounts)]
#[instruction(size: Option<u32>)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = size.unwrap_or(8 + VerificationMethod::default_size() as u32 + DidAccount::initial_size() as u32).try_into().unwrap(),
        seeds = [DID_ACCOUNT_SEED.as_bytes(), authority.key().as_ref()],
        bump )]
    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
