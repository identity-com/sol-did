use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, Secp256k1RawSignature, Service};
use anchor_lang::prelude::*;

#[deprecated(since = "3.0.1", note = "add_service was deprecated for add_service2")]
pub fn add_service(
    ctx: Context<AddService>,
    service: Service,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    let joint_services = [&[service], data.services.as_slice()].concat();
    data.set_services(joint_services, false)
}

#[derive(Accounts)]
#[instruction(service: Service, eth_signature: Option<Secp256k1RawSignature>)]
#[deprecated(since = "3.0.1", note = "AddService was deprecated for AddService2")]
pub struct AddService<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority(&authority.key(), &service.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
