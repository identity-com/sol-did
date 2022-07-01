use crate::state::{DidAccount, NativeDidVerificationKey};
use anchor_lang::prelude::*;

pub fn add_verification_method(ctx: Context<AddVerificationMethod>, newKey: Pubkey) -> Result<()> {
    let newVMEntry = NativeDidVerificationKey {
        alias: String::from("key2"),
        key: newKey,
        flags: 0
    };

    ctx.accounts.did.nativeVerificationKeys.push(newVMEntry);

    // let mut did = ctx.accounts.did.try_borrow_mut_data();
    // did.nativeVerificationKeys.append(newVMEntry);

    msg!("Successfully added a key.");
    Ok(())
}



#[derive(Accounts)]
pub struct AddVerificationMethod<'info> {
    #[account(init, payer = payer, space = 10_000 )]
    pub did: Account<'info, DidAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
