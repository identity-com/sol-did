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

    // increase the nonce. TODO: check if this can be moved to a constraint.
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    // TODO: Should we move those to an anchor constraint?
    require!(
        !VerificationMethodFlags::from_bits(verification_method.flags)
            .unwrap()
            .contains(VerificationMethodFlags::OWNERSHIP_PROOF),
        DidSolError::VmOwnershipOnAdd
    );

    require!(
        !data.has_verification_method(&verification_method.alias),
        DidSolError::VmAliasAlreadyInUse
    );

    data.add_verification_method(verification_method)
}

#[derive(Accounts)]
#[instruction(verification_method: VerificationMethod, eth_signature: Option<Secp256k1RawSignature>)]
pub struct AddVerificationMethod<'info> {
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
