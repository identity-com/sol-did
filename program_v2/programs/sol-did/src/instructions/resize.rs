use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;
use std::convert::TryInto;

pub fn resize(
    _ctx: Context<Resize>,
    _size: u32,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut _ctx.accounts.did_data;

    if eth_signature.is_some() {
        data.nonce += 1;
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(size: u32, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Resize<'info> {
    // TODO: prevent from resizing to less data
    // TODO: Authority can be different to initial authority.
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        realloc = TryInto::<usize>::try_into(size).unwrap(),
        realloc::payer = payer,
        realloc::zero = false,
        constraint = did_data.is_authority(authority.key()) || did_data.is_eth_authority(vec![(size as u8)], eth_signature),
    )]
    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
