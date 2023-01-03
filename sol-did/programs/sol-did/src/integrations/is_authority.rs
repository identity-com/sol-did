use crate::state::VerificationMethodType;
pub use crate::utils::{derive_did_account, derive_did_account_with_bump};
use crate::{errors::DidSolError, DidAccount};
use anchor_lang::prelude::*;
use solana_program::account_info::AccountInfo;

/// Will return if given solana public key, or ethereum address (as derived from an ethereum signature)
/// is a valid authority (CAPABILITY_INVOCATION) on the given did_account.
/// Authorities may be direct, or via a chain of controlling did accounts.
/// In the latter case, the chain must be provided in the following order:
/// did_account -> controlling_did_accounts[0] -> ... -> controlling_did_accounts[n] -> authority
/// where '->' represents the relationship "is controlled by".
/// Controlling DID Accounts are a tuple of (AccountInfo, PublicKey)
/// the public key is used to derive a default DidAccount object, if
/// the DID is a generative DID
pub fn is_authority(
    did_account: &AccountInfo,
    did_account_seed_bump: Option<u8>,
    controlling_did_accounts: &[(&AccountInfo, Pubkey)],
    key: &[u8],
    filter_types: Option<&[VerificationMethodType]>,
    filter_fragment: Option<&String>,
) -> Result<bool> {
    // TODO: Consider to replace this with DidAccount::try_from(...)
    if did_account.owner == &System::id() {
        // msg!("Validating generative DID");
        // the DID is a generative DID - the only authority is the key itself
        // verify that the authority key derives the correct did account

        let address = if let Some(did_account_seed_bump) = did_account_seed_bump {
            derive_did_account_with_bump(key, did_account_seed_bump)
                .map_err(|_| Error::from(ErrorCode::ConstraintSeeds))?
        } else {
            // the key must be a solana pubkey in the generative DID case
            derive_did_account(key).0
        };
        // msg!("Generative DID address for authority: {}", address);
        // msg!("DID account address: {}", did_account.key);
        return Ok(*did_account.key == address);
    }

    let did_data: Account<DidAccount> = Account::try_from(did_account)?;

    // if a chain of controlling did accounts was provided,
    // validate them by parsing and checking the controller relationship,
    // and return the last one, which is the one the authority should be present on.
    // if no chain was provided, the relationship is direct, so return did_data
    let controller_chain: Vec<DidAccount> = controlling_did_accounts
        .iter()
        .map(|c| DidAccount::try_from(c.0, &c.1, None))
        .collect::<Result<Vec<DidAccount>>>()?;

    if !did_data.is_controlled_by(controller_chain.as_slice()) {
        return Err(error!(DidSolError::InvalidControllerChain));
    }
    // NOTE: This line links the lifetime of controller_chain and did_data (which we do not want)
    // NOTE: The following code is a little more verbose to keep lifetimes separate.
    // let did_to_check_authority = controller_chain.last().unwrap_or(&did_data);
    let did_to_check_authority = controller_chain.last();
    let authority_exists = if let Some(did_to_check_authority) = did_to_check_authority {
        did_to_check_authority
            .find_authority(key, filter_types, filter_fragment)
            .is_some()
    } else {
        did_data
            .find_authority(key, filter_types, filter_fragment)
            .is_some()
    };

    Ok(authority_exists)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::constants::VM_DEFAULT_FRAGMENT_NAME;
    use crate::state::{DidAccount, VerificationMethodFlags};
    use crate::utils::derive_did_account;
    use crate::{id, VerificationMethod};
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

        let (did_account_pubkey, bump) = derive_did_account(&authority.to_bytes());

        assert_eq!(did_account_pubkey, expected_did_account);
        assert_eq!(bump, expected_bump);
    }

    #[test]
    fn test_derive_did_account_with_bump() {
        let authority = Pubkey::from_str("6TE7bGggnzahkE7Snfyi8M4LuB3D4YV8CjoBJxn8UDsY").unwrap();
        let expected_did_account =
            Pubkey::from_str("3spWJgYRKqrZnBkgv6dwjohKG5x3ZBEdxoLxuC2LfwD2").unwrap();
        let expected_bump = 255;

        let did_account_pubkey =
            derive_did_account_with_bump(&authority.to_bytes(), expected_bump).unwrap();

        assert_eq!(did_account_pubkey, expected_did_account);
    }

    #[test]
    fn test_is_authority() {
        let test_authority = create_test_authority();
        let test_did_account = create_test_did(test_authority);
        let mut data: Vec<u8> = Vec::with_capacity(1024);
        test_did_account.try_serialize(&mut data).unwrap();
        let derived_did_account = derive_did_account(&test_authority.to_bytes());

        let mut lamports = 1;
        let account_info = AccountInfo {
            key: &derived_did_account.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let should_be_true = is_authority(
            &account_info,
            Some(derived_did_account.1),
            &[],
            &test_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(should_be_true);

        let should_be_true = is_authority(
            &account_info,
            None,
            &[],
            &test_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(should_be_true);
    }

    #[test]
    fn test_is_authority_handles_generative_dids() {
        let test_authority = create_test_authority();

        let mut data: Vec<u8> = Vec::with_capacity(0);
        let mut lamports = 1; // account can have a balance
        let derived_did_account = derive_did_account(&test_authority.to_bytes());

        let account_info = AccountInfo {
            key: &derived_did_account.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &System::id(),
            executable: false,
            rent_epoch: 0,
        };

        let should_be_true = is_authority(
            &account_info,
            Some(derived_did_account.1),
            &[],
            &test_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(should_be_true);
    }

    #[test]
    fn test_is_authority_fails_for_incorrectly_derived_generative_dids() {
        let test_authority = create_test_authority();
        let invalid_did_account_address = Pubkey::new_unique();

        let mut data: Vec<u8> = Vec::with_capacity(0);
        let mut lamports = 0; // empty account
        let account_info = AccountInfo {
            key: &invalid_did_account_address,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &System::id(),
            executable: false,
            rent_epoch: 0,
        };

        // either this returns Ok(false) or Error, but NOT Ok(true).
        let should_be_false = is_authority(
            &account_info,
            Some(0),
            &[],
            &test_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap_or(false);

        assert!(!should_be_false);
    }

    #[test]
    fn test_is_authority_fails_if_key_is_not_on_did() {
        let test_authority = create_test_authority();
        let some_other_authority = create_test_authority();

        let test_did_account = create_test_did(test_authority);
        let mut data: Vec<u8> = Vec::with_capacity(1024);
        test_did_account.try_serialize(&mut data).unwrap();
        let derived_did_account = derive_did_account(&test_authority.to_bytes());

        let mut lamports = 1;
        let account_info = AccountInfo {
            key: &derived_did_account.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let should_be_false = is_authority(
            &account_info,
            Some(derived_did_account.1),
            &[],
            &some_other_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
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
        let derived_did_account = derive_did_account(&test_authority.to_bytes());

        let mut lamports = 1;
        let account_info = AccountInfo {
            key: &derived_did_account.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let should_be_true = is_authority(
            &account_info,
            Some(derived_did_account.1),
            &[],
            &test_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
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

        let mut lamports = 1;
        let derived_did_account = derive_did_account(&test_authority.to_bytes());

        let account_info = AccountInfo {
            key: &derived_did_account.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut lamports)),
            data: Rc::new(RefCell::new(&mut data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let should_be_false = is_authority(
            &account_info,
            Some(derived_did_account.1),
            &[],
            &some_other_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(!should_be_false);
    }

    #[test]
    fn test_is_authority_with_non_generative_controller() {
        let controller_authority = create_test_authority();
        let controlled_authority = create_test_authority();

        assert_ne!(controller_authority, controlled_authority);

        let controller_did_account = create_test_did(controller_authority);
        let mut controlled_did_account = create_test_did(controlled_authority);

        let controller_did_account_address = derive_did_account(&controller_authority.to_bytes());
        let controlled_did_account_address = derive_did_account(&controller_authority.to_bytes());

        controlled_did_account
            .set_native_controllers(vec![controller_authority])
            .unwrap();

        let mut controller_data: Vec<u8> = Vec::with_capacity(1024);
        controller_did_account
            .try_serialize(&mut controller_data)
            .unwrap();

        let mut controlled_data: Vec<u8> = Vec::with_capacity(1024);
        controlled_did_account
            .try_serialize(&mut controlled_data)
            .unwrap();

        let mut controlled_lamports = 1;
        let controlled_account_info = AccountInfo {
            key: &controlled_did_account_address.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut controlled_lamports)),
            data: Rc::new(RefCell::new(&mut controlled_data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let mut controller_lamports = 1;
        let controller_account_info = AccountInfo {
            key: &controller_did_account_address.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut controller_lamports)),
            data: Rc::new(RefCell::new(&mut controller_data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        // check if the controller authority is an authority on the controlled did
        let should_be_true = is_authority(
            &controlled_account_info,
            Some(controlled_did_account_address.1),
            &[(&controller_account_info, controller_authority)],
            &controller_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(should_be_true);
    }

    #[test]
    fn test_is_authority_with_generative_controller() {
        let controller_authority = create_test_authority();
        let controlled_authority = create_test_authority();

        assert_ne!(controller_authority, controlled_authority);

        let mut controlled_did_account = create_test_did(controlled_authority);

        let controller_did_account_address = derive_did_account(&controller_authority.to_bytes());
        let controlled_did_account_address = derive_did_account(&controller_authority.to_bytes());

        controlled_did_account
            .set_native_controllers(vec![controller_authority])
            .unwrap();

        let mut controller_data: Vec<u8> = Vec::with_capacity(0);

        let mut controlled_data: Vec<u8> = Vec::with_capacity(1024);
        controlled_did_account
            .try_serialize(&mut controlled_data)
            .unwrap();

        let mut controlled_lamports = 1;
        let controlled_account_info = AccountInfo {
            key: &controlled_did_account_address.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut controlled_lamports)),
            data: Rc::new(RefCell::new(&mut controlled_data)),
            owner: &id(),
            executable: false,
            rent_epoch: 0,
        };

        let mut controller_lamports = 1;
        let generative_controller_account_info = AccountInfo {
            key: &controller_did_account_address.0,
            is_signer: false,
            is_writable: false,
            lamports: Rc::new(RefCell::new(&mut controller_lamports)),
            data: Rc::new(RefCell::new(&mut controller_data)),
            owner: &System::id(),
            executable: false,
            rent_epoch: 0,
        };

        // check if the controller authority is an authority on the controlled did
        let should_be_true = is_authority(
            &controlled_account_info,
            Some(controlled_did_account_address.1),
            &[(&generative_controller_account_info, controller_authority)],
            &controller_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            None,
        )
        .unwrap();
        assert!(should_be_true);
    }
}
