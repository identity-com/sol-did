use crate::state::{DidAccount,UpdateStruct, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn update(
    ctx: Context<Update>,
    mut update_information: UpdateStruct,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    data.services = update_information.services;
    data.native_controllers = update_information.native_controllers;
    data.other_controllers = update_information.other_controllers;
    data.initial_verification_method.flags = 0;
    let default_alas = & data.initial_verification_method.alias;
    let new_methods = &mut update_information.verification_methods;

    for i in new_methods.clone() {
        if i.alias == *default_alas {
            new_methods.retain(|x| x.alias == *default_alas);
            data.initial_verification_method.flags = i.flags;
            break;
        }
    }
    data.verification_methods = update_information.verification_methods; 

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
