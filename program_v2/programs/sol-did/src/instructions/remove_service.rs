use crate::state::{DidAccount};
use anchor_lang::prelude::*;
use crate::errors::*;

pub fn remove_service(ctx: Context<RemoveService>, service_id: String) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    let length_before = data.services.len();
    data.services.retain(|x| x.id != service_id);
    let length_after = data.services.len();
    if length_after != length_before {
        Ok(())
    } else {
        Err(error!(NonExistingServiceError::NonExistingService))
    }
}

#[derive(Accounts)]
pub struct RemoveService<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
    )]
    pub did_data: Account<'info, DidAccount>,
}