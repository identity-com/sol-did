use crate::constants::DID_ACCOUNT_SEED;
use crate::legacy::LegacyDidAccount;
use crate::state::DidAccount;
use anchor_lang::prelude::*;

pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    let legacy_data = &ctx.accounts.legacy_did_data;

    let bump = *ctx.bumps.get("did_data").unwrap();
    legacy_data.migrate(data, bump)?;

    Ok(())
}

#[derive(Accounts)]
pub struct Migrate<'info> {
    #[account(
        init,
        payer = payer,
        space = legacy_did_data.post_migration_size(),
        seeds = [DID_ACCOUNT_SEED.as_bytes(), authority.key().as_ref()],
        bump,
    )]
    pub did_data: Account<'info, DidAccount>,
    /// CHECK: Authority is checked against legacy_did_data
    pub authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(has_one = authority)]
    pub legacy_did_data: Account<'info, LegacyDidAccount>,
    pub system_program: Program<'info, System>,
}
