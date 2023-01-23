use crate::constants::DID_ACCOUNT_SEED;
use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature, VerificationMethodFlags};
use anchor_lang::prelude::*;

pub fn set_vm_flags(
    ctx: Context<SetVmFlagsMethod>,
    flags_vm: UpdateFlagsVerificationMethod,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    let vm = data.find_verification_method(&flags_vm.fragment);
    require!(vm.is_some(), DidSolError::VmFragmentNotFound);
    let vm = vm.unwrap();
    vm.flags = flags_vm.flags;

    // prevent lockout
    require!(
        data.has_authority_verification_methods(),
        DidSolError::VmCannotRemoveLastAuthority
    );

    Ok(())
}
#[derive(Accounts)]
#[instruction(flags_vm: UpdateFlagsVerificationMethod, eth_signature: Option<Secp256k1RawSignature>)]
pub struct SetVmFlagsMethod<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &flags_vm.try_to_vec().unwrap(), eth_signature.as_ref(), flags_vm.get_filter_fragment()).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}

/// Argument
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct UpdateFlagsVerificationMethod {
    pub fragment: String,
    pub flags: u16,
}

impl UpdateFlagsVerificationMethod {
    pub fn get_filter_fragment(&self) -> Option<&String> {
        let flags = VerificationMethodFlags::from_bits(self.flags).unwrap();
        if flags.intersects(
            VerificationMethodFlags::OWNERSHIP_PROOF | VerificationMethodFlags::PROTECTED,
        ) {
            Some(&self.fragment)
        } else {
            None
        }
    }
}
