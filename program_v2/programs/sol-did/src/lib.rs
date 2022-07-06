use anchor_lang::prelude::*;

use instructions::*;
use crate::state::{DidAccount, Service};

pub mod state;
pub mod instructions;
pub mod errors;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sol_did {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    // TODO implement
    // TODO this should respect
    pub fn authenticate(ctx: Context<DummyInstruction>) -> Result<()> {
        Ok(())
    }

    pub fn add_verification_method(ctx: Context<AddVerificationMethod>, newKey: Pubkey) -> Result<()> {
        instructions::add_verification_method(ctx, newKey)
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

#[derive(Debug, AnchorSerialize, AnchorDeserialize,Clone)]
pub enum VerificationMethodTypes {
    /// The main Ed25519Verification Method.
    /// https://w3c-ccg.github.io/lds-ed25519-2018/
    Ed25519VerificationKey2018,
    /// Verification Method for For 20-bytes Ethereum Keys
    EcdsaSecp256k1RecoveryMethod2020,
    /// Verification Method for a full 32 bytes Secp256k1 Verification Key
    EcdsaSecp256k1VerificationKey2019,
}

