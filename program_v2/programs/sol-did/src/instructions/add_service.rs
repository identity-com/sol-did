use crate::errors::DidSolError;
use crate::state::{DidAccount, Secp256k1RawSignature, Service};
use anchor_lang::prelude::*;

pub fn add_service(
    ctx: Context<AddService>,
    service: Service,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;

    // increase the nonce. TODO: check if this can be moved to a constraint.
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    if data.services.iter().all(|x| x.id != service.id) {
        data.services.push(service);
        Ok(())
    } else {
        Err(error!(DidSolError::ServiceAlreadyExists))
    }
}

#[derive(Accounts)]
#[instruction(service: Service, eth_signature: Option<Secp256k1RawSignature>)]
pub struct AddService<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key()) || did_data.is_eth_authority(service.try_to_vec().unwrap(), eth_signature),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
