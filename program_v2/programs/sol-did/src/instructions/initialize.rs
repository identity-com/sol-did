use crate::state::{DidAccount};
use anchor_lang::prelude::*;

pub fn initialize(
    ctx: Context<Initialize>,
    _size: u32,
) -> Result<()> {

    let did_data = &mut ctx.accounts.did_data;
    did_data.version = 0;
    did_data.bump = *ctx.bumps.get("did_data").unwrap();
    did_data.nonce = 0;

    // Add the authority as a default verification method.
    did_data.initial_authority = ctx.accounts.authority.key().clone();
    // data.verificationMethods.push(VerificationMethod {
    //     alias: String::from("default"),
    //     flags: 0,
    //     method: Default::default(),
    //     key_data: ctx.accounts.authority.key().to_bytes().to_vec(),
    // });

    // TODO: Check uniqueness of alias.
    // let converted_verification_methods: Vec<VerificationMethod> =
    //     additonal_verification_methods.iter().map(VerificationMethod::from).collect();

    // data.verificationMethods.extend(converted_verification_methods);

    msg!("Successfully initialized DID account.");
    Ok(())
}



#[derive(Accounts)]
#[instruction(size: u32)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = size.try_into().unwrap(), seeds = [b"did-account", authority.key().as_ref()], bump )]
    pub did_data: Account<'info, DidAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}


