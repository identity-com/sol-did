use crate::state::{DidAccount};
use anchor_lang::prelude::*;
use crate::errors::*;

pub fn remove_service(ctx: Context<RemoveService>, service_id: String) -> Result<()> {
    let data = &mut ctx.accounts.data;
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
    #[account(mut)]
    pub data: Account<'info, DidAccount>,
}