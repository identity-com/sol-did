mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::{Secp256k1RawSignature, Service, UpdateStruct, VerificationMethodArg, VerificationMethod};

declare_id!("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc");

#[program]
pub mod sol_did {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, size: Option<u32>) -> Result<()> {
        instructions::initialize(ctx, size)
    }

    pub fn resize(
        ctx: Context<Resize>,
        size: u32,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::resize(ctx, size, eth_signature)
    }

    pub fn close(ctx: Context<Close>, eth_signature: Option<Secp256k1RawSignature>) -> Result<()> {
        instructions::close(ctx, eth_signature)
    }

    pub fn add_verification_method(
        ctx: Context<AddVerificationMethod>,
        verification_method: VerificationMethodArg,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_verification_method(ctx, verification_method, eth_signature)
    }

    pub fn remove_verification_method(
        ctx: Context<RemoveVerificationMethod>,
        alias: String,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::remove_verification_method(ctx, alias, eth_signature)
    }

    pub fn add_service(
        ctx: Context<AddService>,
        service: Service,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_service(ctx, service, eth_signature)
    }

    pub fn remove_service(
        ctx: Context<RemoveService>,
        service_id: String,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::remove_service(ctx, service_id, eth_signature)
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

    pub fn update_data(
        ctx: Context<Update>,
        information: UpdateStruct,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::update(ctx, information, eth_signature)
    }
}

#[derive(Accounts)]
pub struct DummyInstruction {}
