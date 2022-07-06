mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;
use state::{VerificationMethodArg};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sol_did {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        size: u32,
    ) -> Result<()> {
        instructions::initialize(ctx, size)
    }

    pub fn resize(
        ctx: Context<Resize>,
        size: u32,
    ) -> Result<()> {
        instructions::resize(ctx, size)
    }

    // TODO implement
    // TODO this should respect
    pub fn authenticate(ctx: Context<DummyInstruction>) -> Result<()> {
        Ok(())
    }

    pub fn add_verification_method(ctx: Context<AddVerificationMethod>, verification_method: VerificationMethodArg) -> Result<()> {
        instructions::add_verification_method(ctx, verification_method)
    }

    // TODO implement
    pub fn remove_verification_method(ctx: Context<DummyInstruction>) -> Result<()> {
        Ok(())
    }

    pub fn add_service(ctx: Context<AddService>, service: Service) -> Result<()> {
        instructions::add_service(ctx, service)
    }

    // TODO implement
    pub fn remove_service(ctx: Context<RemoveService>, service_id: String) -> Result<()> {
        instructions::remove_service(ctx, service_id)
    }

    // TODO implement
    pub fn proof_key_ownership(ctx: Context<DummyInstruction>) -> Result<()> {
        msg!("reached proof");
        Ok(())
    }

    // TODO implement
    pub fn remove_key_ownership(ctx: Context<DummyInstruction>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DummyInstruction {

}
