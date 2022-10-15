use crate::constants::DID_ACCOUNT_SEED;
use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn remove_service(
    ctx: Context<RemoveService>,
    fragment: String,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    data.services
        .iter()
        .position(|vm| vm.fragment == *fragment)
        .map(|index| {
            data.services.remove(index);
        })
        .ok_or_else(|| error!(DidSolError::ServiceFragmentNotFound))
}

#[derive(Accounts)]
#[instruction(service_id: String, eth_signature: Option<Secp256k1RawSignature>)]
pub struct RemoveService<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &service_id.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
