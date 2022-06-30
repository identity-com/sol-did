use std::collections::{HashSet, HashMap};

use account::ServiceDefinition;
use anchor_lang::prelude::*;
use account::DidAccountData;

pub mod account;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod sol_did {
    use super::*;

    // TODO remove
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    // TODO this should respect
    pub fn authenticate(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn addVerificationMethod(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn removeVerificationMethod(ctx: Context<DidAccount>) -> Result<()> {
        Ok(())
    }

    // TODO implement
    pub fn addService(ctx: Context<DidAccount>, service: ServiceDefinition) -> Result<()> {
        ctx.accounts.data.services.push(service);
        Ok(())
    }
    // TODO implement
    pub fn removeService(ctx: Context<DidAccount>, programID: String) -> Result<()> {
        ctx.accounts.data.services.retain(|x| x.id != programID);
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
pub struct DidAccount<'info> {
    data: Account<'info, DidAccountData>,
}

#[derive(Accounts)]
pub struct Initialize {
    
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
