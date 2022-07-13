use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn update(
    ctx: Context<Update>,
    information: DidAccount,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    data.version = information.version;
    data.bump = information.bump;
    data.nonce = information.nonce;
    data.initial_authority = information.initial_authority;
    data.initial_authority_flags = information.initial_authority_flags;
    data.verification_methods = information.verification_methods;
    data.services = information.services;
    data.native_controllers = information.native_controllers;
    data.other_controllers = information.other_controllers;

    // increase the nonce. TODO: check if this can be moved to a constraint.
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(account: DidAccount, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_authority.key().as_ref()],
        bump = did_data.bump,
        constraint = {
            let services =&mut  account.services.try_to_vec().unwrap().clone();
            services.append(&mut account.verification_methods.try_to_vec().unwrap().clone());
            did_data.is_authority(authority.key()) || did_data.is_eth_authority(services.to_vec(), eth_signature)
        }
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
