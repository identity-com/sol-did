use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn close(ctx: Context<Close>, eth_signature: Option<Secp256k1RawSignature>) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    // increase the nonce. TODO: check if this can be moved to a constraint.
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
        seeds = [b"did-account", did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key()) || did_data.is_eth_authority([].to_vec(), eth_signature),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
