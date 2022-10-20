use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn close(ctx: Context<Close>, eth_signature: Option<Secp256k1RawSignature>) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(eth_signature: Option<Secp256k1RawSignature>)]
pub struct Close<'info> {
    #[account(
        mut,
        close = destination,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &[], eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
