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
        close = refund,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
    )]
    pub did_data: Account<'info, DidAccount>,
    pub refund: Signer<'info>,
    pub system_program: Program<'info, System>,
}
