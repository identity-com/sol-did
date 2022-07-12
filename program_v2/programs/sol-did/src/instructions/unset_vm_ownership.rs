use crate::errors::DidSolError;
use crate::state::{DidAccount, VerificationMethod, VerificationMethodArg, VerificationMethodFlags};
use anchor_lang::prelude::*;

pub fn add_verification_method(
    ctx: Context<AddVerificationMethod>,
    verification_method: VerificationMethodArg,
) -> Result<()> {

    let vm = VerificationMethod::from(verification_method);
    let data = &mut ctx.accounts.did_data;

    require!(
        !VerificationMethodFlags::from_bits(vm.flags).unwrap()
        .contains(VerificationMethodFlags::OWNERSHIP_PROOF),
        DidSolError::VmOwnershipOnAdd
    );

    require!(
        !data.has_verification_method(&vm.alias),
        DidSolError::VmAliasAlreadyInUse
    );

    data.add_verification_method(vm)
}

#[derive(Accounts)]
pub struct AddVerificationMethod<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key())
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
