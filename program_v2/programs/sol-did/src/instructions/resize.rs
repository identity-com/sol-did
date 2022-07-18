use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;
use std::convert::TryInto;

pub fn resize(
    ctx: Context<Resize>,
    _size: u32,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }
    Ok(())
}

#[derive(Accounts)]
#[instruction(size: u32, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Resize<'info> {
    // TODO: prevent from resizing to less data
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        realloc = TryInto::<usize>::try_into(size).unwrap(),
        realloc::payer = payer,
        realloc::zero = false,
        constraint = did_data.find_authority(&authority.key(), &[(size as u8)], eth_signature.as_ref(), None).is_some(), // TODO: Size conversion wrong?
    )]
    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
