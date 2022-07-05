use crate::state::{DidAccount, Service};
use anchor_lang::prelude::*;

pub fn add_service(ctx: Context<AddService>, service: Service) -> Result<()> {
    let data = &mut ctx.accounts.data;
    if data.services.iter().all(|x| x.id != service.id) {
        data.services.push(service);
        Ok(())
    } else {
        Err(error!(ErrorCode::RepetitiveService))
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("serviceID already exists in current service")]
    RepetitiveService,
}


#[derive(Accounts)]
pub struct AddService<'info> {
    #[account(mut)]
    pub data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}