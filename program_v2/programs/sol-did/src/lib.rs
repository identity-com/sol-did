use anchor_lang::prelude::*;

use instructions::*;
use state::{VerificationMethod};


pub mod state;
pub mod instructions;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sol_did {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, initial_verification_methods: Vec<VerificationMethod>) -> Result<()> {
        instructions::initialize(ctx, initial_verification_methods)
    }

    // TODO implement
    // TODO this should respect
    pub fn authenticate(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    pub fn add_verification_method(ctx: Context<AddVerificationMethod>, verification_method: VerificationMethod) -> Result<()> {
        instructions::add_verification_method(ctx, verification_method)
    }

    // TODO implement
    pub fn remove_verification_method(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn addService(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn removeService(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn proofKeyOwnership(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn removeKeyOwnership(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct DidAccount {} // TODO Replace with

