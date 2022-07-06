use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {

    let data = &mut ctx.accounts.data;
    data.version = 0;
    data.bump = *ctx.bumps.get("data").unwrap();
    msg!("Successfully initialized DID account.");
    Ok(())
}



#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 10_000, seeds = [b"did-account", authority.key().as_ref()], bump )]
    pub data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
