use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature, VerificationMethodArg};
use anchor_lang::prelude::*;

pub fn remove_verification_method(
    ctx: Context<RemoveVerificationMethod>,
    alias: String,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;

    if eth_signature.is_some() {
        data.nonce += 1;
    }

    let _ = data.remove_verification_method(&alias);

    // prevent lockout
    require!(
        data.has_authority_verification_methods(),
        DidSolError::VmCannotRemoveLastAuthority
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(verification_method: VerificationMethodArg, eth_signature: Option<Secp256k1RawSignature>)]
pub struct RemoveVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key()) || did_data.is_eth_authority(verification_method.try_to_vec().unwrap(), eth_signature),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}