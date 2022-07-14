use crate::errors::DidSolError;
use crate::state::DidAccount;
use crate::Secp256k1RawSignature;
use anchor_lang::prelude::*;

pub fn remove_service(
    ctx: Context<RemoveService>,
    service_id: String,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;

    // increase the nonce. TODO: check if this can be moved to a constraint.
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    let length_before = data.services.len();
    data.services.retain(|x| x.id != service_id);
    let length_after = data.services.len();
    if length_after != length_before {
        Ok(())
    } else {
        Err(error!(DidSolError::ServiceNotFound))
    }
}

#[derive(Accounts)]
#[instruction(service_id: String, eth_signature: Option<Secp256k1RawSignature>)]
pub struct RemoveService<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = did_data.is_authority(authority.key()) || did_data.is_eth_authority(service_id.try_to_vec().unwrap(), eth_signature),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
