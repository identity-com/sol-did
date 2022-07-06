use crate::state::{DidAccount};
use anchor_lang::prelude::*;
use std::convert::TryInto;

pub fn resize(_ctx: Context<Resize>, _size: u32) -> Result<()> {
    Ok(())
}



#[derive(Accounts)]
#[instruction(size: u32)]
pub struct Resize<'info> {
    // TODO: prevent from resizing to less data
    // TODO: Authority can be different to initial authority.
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        realloc = TryInto::<usize>::try_into(size).unwrap(),
        realloc::payer = authority,
        realloc::zero = false
    )]

    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
