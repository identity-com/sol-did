use crate::state::{DidAccount};
use anchor_lang::prelude::*;

pub fn resize(ctx: Context<Resize>) -> Result<()> {

    let data = &mut ctx.accounts.data;
    data.version = 0;
    data.bump = *ctx.bumps.get("data").unwrap();


    msg!("Successfully initialized DID account.");
    Ok(())
}



#[derive(Accounts)]
pub struct Resize<'info> {
    pub data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
