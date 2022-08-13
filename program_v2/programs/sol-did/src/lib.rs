mod constants;
mod errors;
mod instructions;
mod legacy;
mod security_txt;
mod state;
mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::{Secp256k1RawSignature, Service, VerificationMethod};
use crate::state::DidAccount;

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
        eth_signature: Option<Secp256k1RawSignature>,
    ) -> Result<()> {
        instructions::add_service(ctx, service, eth_signature)
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

pub fn is_authority(
    did_account: &AccountInfo,
    sol_authority: &Pubkey,
    eth_message: &[u8],
    eth_raw_signature: Option<&Secp256k1RawSignature>,
    filter_fragment: Option<&String>,
) -> Result<bool> {
    let did_data : Account<DidAccount> = Account::try_from(did_account)?;
    let authority_exists = did_data.find_authority(sol_authority, eth_message, eth_raw_signature, filter_fragment).is_some();

    Ok(authority_exists)
}

#[cfg(test)]
mod test {
    use std::cell::RefCell;
    use std::rc::Rc;
    use crate::constants::VM_DEFAULT_FRAGMENT_NAME;
    use crate::state::{DidAccount, VerificationMethodFlags};
    use super::*;

    fn create_test_authority() -> Pubkey { Pubkey::new_unique() }

    fn create_test_did(test_authority: Pubkey) -> DidAccount {
        DidAccount {
            version: 0,
            bump: 0,
            nonce: 0,
            initial_verification_method: VerificationMethod {
                fragment: VM_DEFAULT_FRAGMENT_NAME.to_string(),
                flags: VerificationMethodFlags::CAPABILITY_INVOCATION.bits(),
                method_type: 0,
                key_data: test_authority.to_bytes().to_vec()
            },
            verification_methods: vec![],
            services: vec![],
            native_controllers: vec![],
            other_controllers: vec![]
        }
    }

    #[test]
    fn test_is_authority() {
        let test_authority = create_test_authority();
        let test_did_account = create_test_did(test_authority);
        let mut data: Vec<u8> = Vec::with_capacity(1024);
        test_did_account.try_serialize(&mut data).unwrap();

        let mut lamports = 1; // must be > 0 to pass the Account::try_from
        let account_info = AccountInfo {
            key: &Default::default(),
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0
        };

        let result = is_authority(
            &account_info,
            &test_authority,
            &[],
            None,
            None
        ).unwrap();
        assert!(result);
    }
}
