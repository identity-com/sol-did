use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;

pub fn remove_service(ctx: Context<RemoveService>, service_id: String) -> Result<()> {
    let data = &mut ctx.accounts.data;
    let length_before = data.services.len();
    data.services.retain(|x| x.id != service_id);
    let length_after = data.services.len();
    if length_after != length_before {
        Ok(())
    } else {
        Err(error!(ErrorCode::NonExistingService))
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("serviceID doesn't exists in current service")]
    NonExistingService,
}

#[derive(Accounts)]
pub struct RemoveService<'info> {
    #[account(mut, seeds = [b"did-account", authority.key().as_ref()], bump )]
    pub data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}