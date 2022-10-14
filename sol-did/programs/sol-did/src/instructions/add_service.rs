use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, Secp256k1RawSignature, Service};
use anchor_lang::prelude::*;

pub fn add_service(
    ctx: Context<AddService>,
    service: Service,
    allow_overwrite: bool,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    let joint_services = [&[service], data.services.as_slice()].concat();
    data.set_services(joint_services, allow_overwrite)
}

// TODO: In a way this is doing a "serialize again, after anchor deserialzes the transaction".
//       Anchor should allow to access the original data, without having to serialize again.
pub fn signed_message(service: &Service, allow_overwrite: bool) -> Vec<u8> {
    let mut message = service.try_to_vec().unwrap();
    message.push(u8::from(allow_overwrite));
    message
}

#[derive(Accounts)]
#[instruction(service: Service, allow_overwrite: bool, eth_signature: Option<Secp256k1RawSignature>)]
pub struct AddService<'info> {
    #[account(
    mut,
    seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
    bump = did_data.bump,
    constraint = did_data.find_authority_constraint(&authority.key(), &signed_message(&service, allow_overwrite), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
