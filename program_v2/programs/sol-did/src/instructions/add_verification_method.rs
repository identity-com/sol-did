use crate::constants::DID_ACCOUNT_SEED;
use crate::errors::DidSolError;

use crate::state::{
    DidAccount, Secp256k1RawSignature, VerificationMethod, VerificationMethodFlags,
};
use anchor_lang::prelude::*;

pub fn add_verification_method(
    ctx: Context<AddVerificationMethod>,
    verification_method: VerificationMethod,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    require!(
        !VerificationMethodFlags::from_bits(verification_method.flags)
            .ok_or(DidSolError::ConversionError)?
            .contains(VerificationMethodFlags::OWNERSHIP_PROOF),
        DidSolError::VmOwnershipOnAdd
    );

    let methods = [
        data.verification_methods.as_slice(),
        &[
            data.initial_verification_method.clone(),
            verification_method,
        ],
    ]
    .concat();
    data.set_verification_methods(methods)
}

#[derive(Accounts)]
#[instruction(verification_method: VerificationMethod, eth_signature: Option<Secp256k1RawSignature>)]
pub struct AddVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority(&authority.key(), &verification_method.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
