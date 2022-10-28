use crate::errors::DidSolError;
use anchor_lang::prelude::*;
use bitflags::bitflags;
use itertools::Itertools;
use num_derive::*;
use num_traits::*;
use std::fmt::{Display, Formatter};

use crate::constants::VM_DEFAULT_FRAGMENT_NAME;
use crate::utils::{
    check_other_controllers, convert_secp256k1pub_key_to_address, derive_did_account,
    derive_did_account_with_bump, eth_verify_message,
};

#[account]
pub struct DidAccount {
    /// Version identifier
    pub version: u8,
    /// Bump
    pub bump: u8,
    /// Nonce, for protecting against replay attacks around secp256k1 signatures.
    pub nonce: u64,
    /// The initial authority key, automatically being added to the array of all Verification Methods.
    pub initial_verification_method: VerificationMethod,
    /// All verification methods
    pub verification_methods: Vec<VerificationMethod>,
    /// Services
    pub services: Vec<Service>,
    /// Controller (native) - did:sol:<controller>
    pub native_controllers: Vec<Pubkey>,
    /// Controller (others) - all others
    pub other_controllers: Vec<String>,
}

impl Display for DidAccount {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let base_58_authority_key = &self.native_controllers.first().unwrap().to_string();
        write!(f, "did:sol:{}", base_58_authority_key)
    }
}

impl DidAccount {
    pub fn new(bump: u8, authority_key: &Pubkey) -> Self {
        Self {
            version: 0,
            bump,
            nonce: 0,
            initial_verification_method: VerificationMethod::default(
                VerificationMethodFlags::CAPABILITY_INVOCATION
                    | VerificationMethodFlags::OWNERSHIP_PROOF,
                authority_key.to_bytes().to_vec(),
            ),
            verification_methods: vec![],
            services: vec![],
            native_controllers: vec![],
            other_controllers: vec![],
        }
    }

    pub fn init(&mut self, bump: u8, authority_key: &Pubkey, flags: VerificationMethodFlags) {
        self.version = 0;
        self.bump = bump;
        self.nonce = 0;

        self.initial_verification_method =
            VerificationMethod::default(flags, authority_key.to_bytes().to_vec());
    }

    /// Accessor for all verification methods (including the initial one)
    /// Enables to pass several filters that are ANDed together.
    fn verification_methods(
        &self,
        filter_types: Option<&[VerificationMethodType]>,
        filter_flags: Option<VerificationMethodFlags>,
        filter_key: Option<&[u8]>,
        filter_fragment: Option<&String>,
    ) -> Vec<&VerificationMethod> {
        std::iter::once(&self.initial_verification_method)
            .chain(self.verification_methods.iter())
            .filter(|vm| match filter_types {
                Some(filter_types) => {
                    filter_types.contains(&VerificationMethodType::from_u8(vm.method_type).unwrap())
                }
                None => true,
            })
            .filter(|vm| match filter_flags {
                Some(filter_flags) => VerificationMethodFlags::from_bits(vm.flags)
                    .unwrap()
                    .contains(filter_flags),
                None => true,
            })
            .filter(|vm| match filter_key {
                Some(filter_key) => vm.key_data == filter_key,
                None => true,
            })
            .filter(|vm| match filter_fragment {
                Some(filter_fragment) => vm.fragment == *filter_fragment,
                None => true,
            })
            .collect()
    }

    /// Accessor for all verification methods (including the initial one)
    /// Enables to pass several filters that are ANDed together.
    /// Mutable Version
    fn verification_methods_mut(
        &mut self,
        filter_types: Option<&[VerificationMethodType]>,
        filter_flags: Option<VerificationMethodFlags>,
        filter_key: Option<&[u8]>,
        filter_fragment: Option<&String>,
    ) -> Vec<&mut VerificationMethod> {
        std::iter::once(&mut self.initial_verification_method)
            .chain(self.verification_methods.iter_mut())
            .filter(|vm| match filter_types {
                Some(filter_types) => {
                    filter_types.contains(&VerificationMethodType::from_u8(vm.method_type).unwrap())
                }
                None => true,
            })
            .filter(|vm| match filter_flags {
                Some(filter_flags) => VerificationMethodFlags::from_bits(vm.flags)
                    .unwrap()
                    .contains(filter_flags),
                None => true,
            })
            .filter(|vm| match filter_key {
                Some(filter_key) => vm.key_data == filter_key,
                None => true,
            })
            .filter(|vm| match filter_fragment {
                Some(filter_fragment) => vm.fragment == *filter_fragment,
                None => true,
            })
            .collect()
    }

    pub fn remove_verification_method(&mut self, fragment: &String) -> Result<()> {
        // default case
        if fragment == &self.initial_verification_method.fragment {
            self.initial_verification_method.flags = 0;
            return Ok(());
        }

        // general case
        self.verification_methods
            .iter()
            .position(|vm| vm.fragment == *fragment)
            .map(|index| {
                self.verification_methods.remove(index);
            })
            .ok_or_else(|| error!(DidSolError::VmFragmentNotFound))
    }

    pub fn find_verification_method(
        &mut self,
        fragment: &String,
    ) -> Option<&mut VerificationMethod> {
        self.verification_methods_mut(None, None, None, Some(fragment))
            .into_iter()
            .next()
    }

    pub fn has_authority_verification_methods(&self) -> bool {
        !self
            .verification_methods(
                Some(&VerificationMethodType::authority_types()),
                Some(VerificationMethodFlags::CAPABILITY_INVOCATION),
                None,
                None,
            )
            .is_empty()
    }

    pub fn find_authority_constraint(
        &self,
        sol_authority: &Pubkey,
        eth_message: &[u8],
        eth_raw_signature: Option<&Secp256k1RawSignature>,
        filter_fragment: Option<&String>,
    ) -> Option<&VerificationMethod> {
        // find sol authority
        let vm = self.find_authority(
            &sol_authority.to_bytes(),
            Some(&[VerificationMethodType::Ed25519VerificationKey2018]),
            filter_fragment,
        );
        if vm.is_some() {
            return vm;
        }

        if let Some(eth_raw_signature) = eth_raw_signature {
            // recover key
            let secp256k1_pubkey = eth_verify_message(
                eth_message,
                self.nonce,
                eth_raw_signature.signature,
                eth_raw_signature.recovery_id,
            )
            .ok()?;

            let vm = self.find_authority(
                &secp256k1_pubkey.to_bytes(),
                Some(&[VerificationMethodType::EcdsaSecp256k1VerificationKey2019]),
                filter_fragment,
            );
            if vm.is_some() {
                return vm;
            }

            let address = convert_secp256k1pub_key_to_address(&secp256k1_pubkey);
            let vm = self.find_authority(
                &address,
                Some(&[VerificationMethodType::EcdsaSecp256k1RecoveryMethod2020]),
                filter_fragment,
            );
            if vm.is_some() {
                return vm;
            }
        }

        None
    }

    pub fn find_authority(
        &self,
        key: &[u8],
        filter_types: Option<&[VerificationMethodType]>,
        filter_fragment: Option<&String>,
    ) -> Option<&VerificationMethod> {
        // msg!("Checking if key {:?} is an authority", key,);
        self.verification_methods(
            filter_types,
            Some(VerificationMethodFlags::CAPABILITY_INVOCATION),
            Some(key),
            filter_fragment,
        )
        .into_iter()
        .next()
    }

    /// Returns true if `other` is a valid controller of this DID
    pub fn is_directly_controlled_by(&self, other: &DidAccount) -> bool {
        other.other_controllers.contains(&self.to_string())
    }

    /// returns true if the controller chain is valid.
    /// The chain must be provided in the following order:
    /// this -> chain[0] -> ... -> chain[n]
    /// where '->' represents the relationship "is controlled by".
    /// NOTE: an empty chain returns `true`.
    pub fn is_controlled_by(&self, chain: &[Account<DidAccount>]) -> bool {
        match chain {
            [head, tail @ ..] => match self.is_directly_controlled_by(head) {
                true => head.is_controlled_by(tail),
                false => false,
            },
            _ => true,
        }
    }

    pub fn set_services(&mut self, services: Vec<Service>, allow_duplicates: bool) -> Result<()> {
        let original_size = services.len();
        // make sure there are not duplicate services
        // Note: the first service is the one retained.
        let unique_services = services
            .into_iter()
            .unique_by(|x| x.fragment.clone())
            .collect_vec();

        require!(
            allow_duplicates || unique_services.len() == original_size,
            DidSolError::ServiceFragmentAlreadyInUse
        );

        self.services = unique_services;
        Ok(())
    }

    pub fn set_verification_methods(
        &mut self,
        existing: Vec<VerificationMethod>,
        incoming: Vec<VerificationMethod>,
    ) -> Result<()> {
        // check that incoming VMs do NOT set any Ownership flags.
        incoming.iter().try_for_each(|vm| {
            match VerificationMethodFlags::from_bits(vm.flags)
                .ok_or(DidSolError::ConversionError)?
                .contains(VerificationMethodFlags::OWNERSHIP_PROOF)
            {
                true => Err(DidSolError::VmOwnershipOnAdd),
                false => Ok(()),
            }
        })?;

        let methods = [existing, incoming].concat();
        let original_size = methods.len();
        let mut unique_methods = methods
            .into_iter()
            .unique_by(|x| x.fragment.clone())
            .collect_vec();
        require!(
            unique_methods.len() == original_size,
            DidSolError::VmFragmentAlreadyInUse
        );

        // handle initial type if it exists
        // 1. remove from unique_methods
        // 2. set self.initial_verification_method.flags
        if let Some(index) = unique_methods
            .iter()
            .position(|vm| vm.fragment == self.initial_verification_method.fragment)
        {
            self.initial_verification_method.flags = unique_methods.swap_remove(index).flags;
        }

        self.verification_methods = unique_methods;

        Ok(())
    }

    pub fn set_native_controllers(&mut self, native_controllers: Vec<Pubkey>) -> Result<()> {
        self.native_controllers = native_controllers.into_iter().unique().collect_vec();

        let own_authority = Pubkey::new(&self.initial_verification_method.key_data);

        require!(
            !self.native_controllers.contains(&own_authority),
            DidSolError::InvalidNativeControllers,
        );

        Ok(())
    }

    pub fn set_other_controllers(&mut self, other_controllers: Vec<String>) -> Result<()> {
        self.other_controllers = other_controllers.into_iter().unique().collect_vec();

        require!(
            check_other_controllers(&self.other_controllers),
            DidSolError::InvalidOtherControllers
        );

        Ok(())
    }

    // Support generative and non-generative accounts
    pub fn try_from(
        did_account: &AccountInfo,
        initial_authority: &Pubkey,
        did_account_seed_bump: Option<u8>,
    ) -> Result<DidAccount> {
        if did_account.owner == &System::id() {
            // Generative account
            let (derived_did_account, bump) =
                if let Some(did_account_seed_bump) = did_account_seed_bump {
                    (
                        derive_did_account_with_bump(
                            &initial_authority.to_bytes(),
                            did_account_seed_bump,
                        )
                        .map_err(|_| Error::from(ErrorCode::ConstraintSeeds))?,
                        did_account_seed_bump,
                    )
                } else {
                    derive_did_account(&initial_authority.to_bytes())
                };

            // wrong authority for generative account
            if derived_did_account != *did_account.key {
                return Err(error!(DidSolError::WrongAuthorityForDid));
            }

            return Ok(DidAccount::new(bump, initial_authority));
        }
        // Non-generative account
        let did_account: Account<DidAccount> = Account::try_from(did_account)?;
        Ok(did_account.into_inner())
    }

    pub fn size(&self) -> usize {
        1 // version
        + 1 // bump
        + 8 // nonce
        + VerificationMethod::default_size() // initial_authority
        + 4 + self.verification_methods.iter().fold(0, | accum, item| { accum + item.size() }) // verification_methods
        + 4 + self.services.iter().fold(0, | accum, item| { accum + item.size() }) // services
        + 4 + self.native_controllers.len() * 32 // native_controllers
        + 4 + self.other_controllers.iter().fold(0, | accum, item| { accum + 4 + item.len() })
        // other_controllers
    }

    pub fn initial_size() -> usize {
        1 // version
        + 1 // bump
        + 8 // nonce
        + VerificationMethod::default_size() // initial_authority
        + 4 // verification_methods
        + 4 // services
        + 4 // native_controllers
        + 4 // other_controllers
    }
}

#[derive(
    AnchorSerialize, AnchorDeserialize, Copy, Clone, FromPrimitive, ToPrimitive, PartialEq,
)]
pub enum VerificationMethodType {
    /// The main Ed25519Verification Method.
    /// https://w3c-ccg.github.io/lds-ed25519-2018/
    Ed25519VerificationKey2018,
    /// Verification Method for For 20-bytes Ethereum Keys
    EcdsaSecp256k1RecoveryMethod2020,
    /// Verification Method for a full 32 bytes Secp256k1 Verification Key
    EcdsaSecp256k1VerificationKey2019,
}

impl VerificationMethodType {
    pub fn authority_types() -> [VerificationMethodType; 3] {
        [
            VerificationMethodType::Ed25519VerificationKey2018,
            VerificationMethodType::EcdsaSecp256k1VerificationKey2019,
            VerificationMethodType::EcdsaSecp256k1RecoveryMethod2020,
        ]
    }

    // pub fn is_authority_type(vm_type: u8) -> bool {
    //     let vm_type = VerificationMethodType::from_u8(vm_type).unwrap();
    //     VerificationMethodType::authority_types().contains(&vm_type)
    // }
}

impl Default for VerificationMethodType {
    fn default() -> Self {
        VerificationMethodType::Ed25519VerificationKey2018
    }
}

/// The native authority key for a [`DidAccount`]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationMethod {
    /// fragment
    pub fragment: String,
    /// The permissions this key has
    pub flags: u16,
    /// The actual verification method
    pub method_type: u8, // Type: VerificationMethodType- Anchor does not yet provide mappings for enums
    /// Dynamically sized key matching the given VerificationType
    pub key_data: Vec<u8>,
}

impl VerificationMethod {
    pub fn size(&self) -> usize {
        4 + self.fragment.len()
        + 2 // flags
        + 1 // method
        + 4 + self.key_data.len()
    }

    pub fn default(flags: VerificationMethodFlags, key_data: Vec<u8>) -> VerificationMethod {
        VerificationMethod {
            fragment: String::from(VM_DEFAULT_FRAGMENT_NAME),
            flags: flags.bits(),
            method_type: VerificationMethodType::default().to_u8().unwrap(),
            key_data,
        }
    }

    pub fn default_size() -> usize {
        4 + 7 // fragment "default"
        + 2 // flags
        + 1 // method
        + 4 + 32 // ed25519 pubkey
    }
}

/// A Service Definition [`DidAccount`]
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Service {
    pub fragment: String,
    pub service_type: String,
    pub service_endpoint: String,
}

impl Service {
    pub fn size(&self) -> usize {
        4 + self.fragment.len() + 4 + self.service_type.len() + 4 + self.service_endpoint.len()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct Secp256k1RawSignature {
    signature: [u8; 64],
    recovery_id: u8,
}

bitflags! {
    pub struct VerificationMethodFlags: u16 {
        const NONE = 0;
        /// The VM is able to authenticate the subject
        const AUTHENTICATION = 1 << 0;
        /// The VM is able to proof assertions on the subject
        const ASSERTION = 1 << 1;
        /// The VM can be used for encryption
        const KEY_AGREEMENT = 1 << 2;
        /// The VM can be used for issuing capabilities. Required for DID Update
        const CAPABILITY_INVOCATION = 1 << 3;
        /// The VM can be used for delegating capabilities.
        const CAPABILITY_DELEGATION = 1 << 4;
        /// The VM is hidden from the DID Document (off-chain only)
        const DID_DOC_HIDDEN = 1 << 5;
        /// The subject did proof to be in possession of the private key
        const OWNERSHIP_PROOF = 1 << 6;
    }
}
