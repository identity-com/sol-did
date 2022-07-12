use crate::state::DidAccount;
use anchor_lang::prelude::*;

pub fn remove_verification_method(
    ctx: Context<RemoveVerificationMethod>,
    alias: String,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;

    data.remove_verification_method(&alias)
    // TODO: Prevent Lockout
}

#[derive(Accounts)]
pub struct RemoveVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key())
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
