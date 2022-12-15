//! This crate contains the anchor-program code for the did:sol DID method.
//!
//! It exposes the public #program instructions, as well as integrations libraries that are
//! independent of the anchor framework.
#![allow(clippy::result_large_err)]
#![warn(
unused_import_braces,
unused_imports,
// missing_docs,
// missing_debug_implementations,
// clippy::pedantic
)]

pub mod constants;
pub mod errors;
pub mod integrations;
pub mod legacy;
pub mod state;
pub mod utils;

mod instructions;
mod security_txt;

use crate::constants::DID_ACCOUNT_SEED;
use crate::state::DidAccount;
use anchor_lang::prelude::*;
use instructions::*;
use state::{Secp256k1RawSignature, Service, VerificationMethod};

declare_id!("didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc");

#[program]
pub mod sol_did {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, size: u32) -> Result<()> {
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
        verification_method: VerificationMethod,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_verification_method(ctx, verification_method, eth_signature)
    }

    pub fn remove_verification_method(
        ctx: Context<RemoveVerificationMethod>,
        fragment: String,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::remove_verification_method(ctx, fragment, eth_signature)
    }

    pub fn add_service(
        ctx: Context<AddService>,
        service: Service,
        allow_overwrite: bool,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_service(ctx, service, allow_overwrite, eth_signature)
    }

    pub fn remove_service(
        ctx: Context<RemoveService>,
        fragment: String,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::remove_service(ctx, fragment, eth_signature)
    }

    pub fn set_vm_flags(
        ctx: Context<SetVmFlagsMethod>,
        flags_vm: UpdateFlagsVerificationMethod,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::set_vm_flags(ctx, flags_vm, eth_signature)
    }

    pub fn set_controllers(
        ctx: Context<SetControllers>,
        set_controllers_arg: SetControllersArg,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::set_controllers(ctx, set_controllers_arg, eth_signature)
    }

    pub fn update(
        ctx: Context<Update>,
        update_arg: UpdateArg,
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::update(ctx, update_arg, eth_signature)
    }

    pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
        instructions::migrate(ctx)
    }
}
