use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;

pub fn add_service(ctx: Context<AddService>, service: Service) -> Result<()> {

    ctx.accounts.data.services.push(service);

    msg!("Successfully added Service to account");
    Ok(())
}


#[derive(Accounts)]
pub struct AddService<'info> {
    #[account(mut)]
    pub data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}