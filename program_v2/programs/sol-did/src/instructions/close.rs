use crate::state::DidAccount;
use anchor_lang::prelude::*;

pub fn close(_ctx: Context<Close>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Close<'info> {
    // TODO: prevent from resizing to less data
    // TODO: Authority can be different to initial authority.
    #[account(
        mut,
        close = destination,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key()),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    /// CHECK: Rent destination account does not need to satisfy the any constraints.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
