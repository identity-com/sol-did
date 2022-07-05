use crate::state::{DidAccount, VerificationMethod};
use anchor_lang::prelude::*;


pub fn add_verification_method(ctx: Context<AddVerificationMethod>, verificationMethod: VerificationMethod) -> Result<()> {

    // TODO: Check alias uniqueness
    ctx.accounts.did.verificationMethods.push(verificationMethod);

    // let mut did = ctx.accounts.did.try_borrow_mut_data();
    // did.nativeVerificationKeys.append(newVMEntry);

    msg!("Successfully added a key.");
    Ok(())
}



#[derive(Accounts)]
pub struct AddVerificationMethod<'info> {
    #[account()]
    pub did: Account<'info, DidAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
