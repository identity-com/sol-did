use crate::errors::*;
use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;

pub fn add_service(ctx: Context<AddService>, service: Service) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if data.services.iter().all(|x| x.id != service.id) {
        data.services.push(service);
        Ok(())
    } else {
        Err(error!(RepetitiveServiceError::RepetitiveService))
    }
}

#[derive(Accounts)]
pub struct AddService<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
    )]
    pub did_data: Account<'info, DidAccount>,
}
