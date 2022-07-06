use crate::state::{DidAccount, VerificationMethod, VerificationMethodArg};
use anchor_lang::prelude::*;


pub fn add_verification_method(ctx: Context<AddVerificationMethod>, verification_method: VerificationMethodArg) -> Result<()> {

    // TODO: Check alias uniqueness
    ctx.accounts.did_data.add_verification_method(VerificationMethod::from(verification_method));

    // let mut did = ctx.accounts.did.try_borrow_mut_data();
    // did.nativeVerificationKeys.append(newVMEntry);

    msg!("Successfully added a key.");
    Ok(())
}



#[derive(Accounts)]
pub struct AddVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
    )]
    pub did_data: Account<'info, DidAccount>,

    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
