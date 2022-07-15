use crate::state::{DidAccount,UpdateStruct, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn update(
    ctx: Context<Update>,
    information: UpdateStruct,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    data.services = information.services;
    data.native_controllers = information.native_controllers;
    data.other_controllers = information.other_controllers;
    let vms = &mut data.verification_methods;
    let default_alas = & data.initial_verification_method.alias;
    vms.retain(|x| x.alias == *default_alas);
    if vms.len() == 1 {
        data.initial_verification_method.flags = 0;
        return Ok(());
    }
    // increase the nonce. TODO: check if this can be moved to a constraint.
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(account: UpdateStruct, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_verification_method.key_data.as_ref()],
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
