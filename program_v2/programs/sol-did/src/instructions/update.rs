use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;
use crate::{Service, VerificationMethod};

pub fn update(
    ctx: Context<Update>,
    update_arg: UpdateArg,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {

    // Move the business logic DidAccount struct.
    let data = &mut ctx.accounts.did_data;
    data.set_services(update_arg.services).unwrap();


    // data.services = update_arg.services;
    data.native_controllers = update_arg.native_controllers;
    data.other_controllers = update_arg.other_controllers;
    data.initial_verification_method.flags = 0;
    let default_alias = &data.initial_verification_method.fragment;
    let mut flag = data.initial_verification_method.flags;
    // let new_methods = &mut update_arg.verification_methods;
    // new_methods.retain(|x| {
    //     if x.fragment == *default_alias {
    //         flag = x.flags;
    //         false
    //     } else {
    //         true
    //     }
    // });
    // data.initial_verification_method.flags = flag;

    data.verification_methods = update_arg.verification_methods;

    if eth_signature.is_some() {
        data.nonce += 1;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(update_arg: UpdateArg, eth_signature: Option<Secp256k1RawSignature>)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"did-account", did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority(&authority.key(), &update_arg.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some()
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}

/// Argument
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateArg {
    /// All verification methods
    pub verification_methods: Vec<VerificationMethod>,
    /// Services
    pub services: Vec<Service>,
    /// Controller (native) - did:sol:<controller>
    pub native_controllers: Vec<Pubkey>,
    /// Controller (others) - all others
    pub other_controllers: Vec<String>,
}
