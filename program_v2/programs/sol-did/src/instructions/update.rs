use crate::state::{DidAccount, Secp256k1RawSignature, UpdateStruct};
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
    let default_alias = &data.initial_verification_method.alias;
    let mut flag = data.initial_verification_method.flags;
    let new_methods = &mut update_information.verification_methods;
    new_methods.retain(|x| {
        if x.alias == *default_alias {
            flag = x.flags;
            false
        } else {
            true
        }
    });
    data.initial_verification_method.flags = flag;

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
            let services =&mut  account.services.try_to_vec().unwrap();
            services.append(&mut account.verification_methods.try_to_vec().unwrap());
            did_data.find_authority(&authority.key(), &services.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some()
        }
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}
