use crate::constants::DID_ACCOUNT_SEED;
use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn remove_verification_method(
    ctx: Context<RemoveVerificationMethod>,
    fragment: String,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    // cannot remove protected verification methods
    require!(
        !data.has_protected_verification_method(Some(&fragment)),
        DidSolError::VmCannotRemoveProtected
    );

    let _ = data.remove_verification_method(&fragment);

    // prevent lockout
    require!(
        data.has_authority_verification_methods(),
        DidSolError::VmCannotRemoveLastAuthority
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(fragment: String, eth_signature: Option<Secp256k1RawSignature>)]
pub struct RemoveVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &fragment.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
