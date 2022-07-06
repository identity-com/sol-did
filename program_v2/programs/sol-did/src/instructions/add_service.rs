use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;
use crate::errors::*;

pub fn add_service(ctx: Context<AddService>, service: Service) -> Result<()> {
    let data = &mut ctx.accounts.data;
    if data.services.iter().all(|x| x.id != service.id) {
        data.services.push(service);
        Ok(())
    } else {
        Err(error!(RepetitiveServiceError::RepetitiveService))
    }
}

#[derive(Accounts)]
pub struct AddService<'info> {
    #[account(mut)]
    pub data: Account<'info, DidAccount>,
}