mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::{Service, VerificationMethodArg, Secp256k1RawSignature};

declare_id!("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc");

#[program]
pub mod sol_did {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, size: Option<u32>) -> Result<()> {
        instructions::initialize(ctx, size)
    }

    pub fn resize(ctx: Context<Resize>, size: u32) -> Result<()> {
        instructions::resize(ctx, size)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        instructions::close(ctx)
    }

    pub fn add_verification_method(
        ctx: Context<AddVerificationMethod>,
        verification_method: VerificationMethodArg,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_verification_method(ctx, verification_method, eth_signature)
    }

    pub fn remove_verification_method(ctx: Context<RemoveVerificationMethod>, alias: String) -> Result<()> {
       instructions::remove_verification_method(ctx, alias)
    }

    pub fn add_service(ctx: Context<AddService>,
                       service: Service,
                       eth_signature: Option<Secp256k1RawSignature>) -> Result<()> {
        instructions::add_service(ctx, service, eth_signature)
    }

    pub fn remove_service(ctx: Context<RemoveService>, service_id: String) -> Result<()> {
        instructions::remove_service(ctx, service_id)
    }

    // TODO implement
    pub fn set_key_ownership(_ctx: Context<DummyInstruction>) -> Result<()> {
        msg!("reached proof");
        Ok(())
    }

    // TODO implement
    pub fn unset_key_ownership(_ctx: Context<DummyInstruction>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DummyInstruction {}
