extern crate core;

mod constants;
mod errors;
mod instructions;
mod legacy;
mod security_txt;
mod state;
mod utils;

use crate::constants::DID_ACCOUNT_SEED;
use crate::{errors::DidSolError, state::DidAccount};
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

// /// Given a DidAccount, and a list of controlling did accountInfos,
// /// Parse the controlling did accountInfos into DidAccounts,
// /// and validate that the controller chain is correct
// fn valid_controller_chain<'a, 'b: 'a>(
//     did_data: &'a Account<DidAccount>,
//     did_accounts: &'b [AccountInfo<'b>],
// ) -> Result<Vec<Account<'b, DidAccount>>> {
//     let controller_chain: Vec<Account<DidAccount>> = did_accounts
//         .iter()
//         .map(Account::try_from)
//         .collect::<Result<Vec<Account<DidAccount>>>>()?;
//
//     if !did_data.is_controlled_by(controller_chain.as_slice()) {
//         return Err(error!(DidSolError::InvalidControllerChain));
//     }
//
//     Ok(controller_chain)
// }
//
// fn last_in_valid_controller_chain<'a, 'b: 'a>(
//     did_data: &'a Account<DidAccount>,
//     did_accounts: &'b [AccountInfo<'b>],
// ) -> Result<Option<&'b Account<'b, DidAccount>>> {
//     valid_controller_chain(did_data, did_accounts).map(|chain| chain.last())
// }

/// Will return if given solana public key, or ethereum address (as derived from an ethereum signature)
/// is a valid authority (CAPABILITY_INVOCATION) on the given did_account.
/// Authorities may be direct, or via a chain of controlling did accounts.
/// In the latter case, the chain must be provided in the following order:
/// did_account -> controlling_did_accounts[0] -> ... -> controlling_did_accounts[n] -> authority
/// where '->' represents the relationship "is controlled by".
pub fn is_authority<'a>(
    did_account: &'a AccountInfo<'a>,
    controlling_did_accounts: &'a [AccountInfo<'a>],
    sol_authority: &Pubkey,
    eth_message: &[u8],
    eth_raw_signature: Option<&Secp256k1RawSignature>,
    filter_fragment: Option<&String>,
) -> Result<bool> {
    let did_data: Account<DidAccount> = Account::try_from(did_account)?;

    // if a chain of controlling did accounts was provided,
    // validate them by parsing and checking the controller relationship,
    // and return the last one, which is the one the authority should be present on.
    // if no chain was provided, the relationship is direct, so return did_data

    // WHAT I WANT
    // let did_to_check_authority =
    //     last_in_valid_controller_chain(&did_data, controlling_did_accounts)?.unwrap_or(&did_data);

    // WHAT I HAVE TO DO INSTEAD
    let controller_chain: Vec<Account<DidAccount>> = controlling_did_accounts
        .iter()
        .map(Account::try_from)
        .collect::<Result<Vec<Account<DidAccount>>>>()?;

    if !did_data.is_controlled_by(controller_chain.as_slice()) {
        return Err(error!(DidSolError::InvalidControllerChain));
    }
    let did_to_check_authority = controller_chain.last().unwrap_or(&did_data);

    let authority_exists = did_to_check_authority
        .find_authority(
            sol_authority,
            eth_message,
            eth_raw_signature,
            filter_fragment,
        )
        .is_some();

    Ok(authority_exists)
}

pub fn derive_did_account(authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[DID_ACCOUNT_SEED.as_bytes(), authority.key().as_ref()],
        &id(),
    )
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::constants::VM_DEFAULT_FRAGMENT_NAME;
    use crate::state::{DidAccount, VerificationMethodFlags};
    use std::cell::RefCell;
    use std::rc::Rc;
    use std::str::FromStr;

    fn create_test_authority() -> Pubkey {
        Pubkey::new_unique()
    }

    fn create_test_did(test_authority: Pubkey) -> DidAccount {
        DidAccount {
            version: 0,
            bump: 0,
            nonce: 0,
            initial_verification_method: VerificationMethod {
                fragment: VM_DEFAULT_FRAGMENT_NAME.to_string(),
                flags: VerificationMethodFlags::CAPABILITY_INVOCATION.bits(),
                method_type: 0,
                key_data: test_authority.to_bytes().to_vec(),
            },
            verification_methods: vec![],
            services: vec![],
            native_controllers: vec![],
            other_controllers: vec![],
        }
    }

    #[test]
    fn test_derive_did_account() {
        let authority = Pubkey::from_str("6TE7bGggnzahkE7Snfyi8M4LuB3D4YV8CjoBJxn8UDsY").unwrap();
        let expected_did_account =
            Pubkey::from_str("3spWJgYRKqrZnBkgv6dwjohKG5x3ZBEdxoLxuC2LfwD2").unwrap();
        let expected_bump = 255;

        let (did_account_pubkey, bump) = derive_did_account(&authority);

        assert_eq!(did_account_pubkey, expected_did_account);
        assert_eq!(bump, expected_bump);
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
            rent_epoch: 0,
        };

        let should_be_true =
            is_authority(&account_info, &[], &test_authority, &[], None, None).unwrap();
        assert!(should_be_true);
    }

    #[test]
    fn test_is_authority_fails_if_key_is_not_on_did() {
        let test_authority = create_test_authority();
        let some_other_authority = create_test_authority();

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
            rent_epoch: 0,
        };

        let should_be_false =
            is_authority(&account_info, &[], &some_other_authority, &[], None, None).unwrap();
        assert!(!should_be_false);
    }

    #[test]
    fn test_is_authority_passes_for_non_default_verification_method() {
        let test_authority = create_test_authority();
        let some_other_authority = create_test_authority();

        let mut test_did_account = create_test_did(test_authority);
        test_did_account
            .verification_methods
            .push(VerificationMethod {
                fragment: "second_key".to_string(),
                flags: VerificationMethodFlags::CAPABILITY_INVOCATION.bits(),
                method_type: 0,
                key_data: some_other_authority.to_bytes().to_vec(),
            });

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
            rent_epoch: 0,
        };

        let should_be_true =
            is_authority(&account_info, &[], &some_other_authority, &[], None, None).unwrap();
        assert!(should_be_true);
    }

    #[test]
    fn test_is_authority_fails_if_the_key_is_not_capability_invocation() {
        let test_authority = create_test_authority();
        let some_other_authority = create_test_authority();

        let mut test_did_account = create_test_did(test_authority);
        test_did_account
            .verification_methods
            .push(VerificationMethod {
                fragment: "second_key".to_string(),
                flags: VerificationMethodFlags::AUTHENTICATION.bits(), // not CAPABILITY_INVOCATION
                method_type: 0,
                key_data: some_other_authority.to_bytes().to_vec(),
            });

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
            rent_epoch: 0,
        };

        let should_be_false =
            is_authority(&account_info, &[], &some_other_authority, &[], None, None).unwrap();
        assert!(!should_be_false);
    }
}
