use crate::constants::DID_ACCOUNT_SEED;
use crate::state::{DidAccount, Secp256k1RawSignature};
use anchor_lang::prelude::*;

pub fn set_controllers(
    ctx: Context<SetControllers>,
    set_controllers_arg: SetControllersArg,
    eth_signature: Option<Secp256k1RawSignature>,
) -> Result<()> {
    let data = &mut ctx.accounts.did_data;
    if eth_signature.is_some() {
        data.nonce += 1;
    }

    data.set_native_controllers(set_controllers_arg.native_controllers)?;
    data.set_other_controllers(set_controllers_arg.other_controllers)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(set_controllers_arg: SetControllersArg, eth_signature: Option<Secp256k1RawSignature>)]
pub struct SetControllers<'info> {
    #[account(
        mut,
        seeds = [DID_ACCOUNT_SEED.as_bytes(), did_data.initial_verification_method.key_data.as_ref()],
        bump = did_data.bump,
        constraint = did_data.find_authority_constraint(&authority.key(), &set_controllers_arg.try_to_vec().unwrap(), eth_signature.as_ref(), None).is_some(),
    )]
    pub did_data: Account<'info, DidAccount>,
    pub authority: Signer<'info>,
}

/// Argument
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct SetControllersArg {
    pub native_controllers: Vec<Pubkey>,
    pub other_controllers: Vec<String>,
}
