use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature};
use crate::{Service, VerificationMethod};
use anchor_lang::prelude::*;

pub fn update(
    ctx: Context<Update>,
    update_arg: UpdateArg,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    // Move the business logic DidAccount struct.
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    // Cannot update DID if protected services exist.
    require!(
        !data.has_protected_verification_method(None),
        DidSolError::VmCannotRemoveProtected
    );

    data.set_services(update_arg.services, false)?;
    data.set_verification_methods(Vec::new(), update_arg.verification_methods)?;
    data.set_native_controllers(update_arg.native_controllers)?;
    data.set_other_controllers(update_arg.other_controllers)?;

    // prevent lockout
    require!(
        data.has_authority_verification_methods(),
        DidSolError::VmCannotRemoveLastAuthority
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(update_arg: UpdateArg, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &update_arg.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some()
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}

/// Argument
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateArg {
    /// All verification methods
    pub verification_methods: Vec<VerificationMethod>,
    /// Services
    pub services: Vec<Service>,
    /// Controller (native) - did:sol:<controller>
    pub native_controllers: Vec<Pubkey>,
    /// Controller (others) - all others
    pub other_controllers: Vec<String>,
}
