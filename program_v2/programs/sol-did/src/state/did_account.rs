use crate::errors::DidSolError;
use anchor_lang::prelude::*;
use bitflags::bitflags;
use num_derive::*;
use num_traits::*;

use solana_program::{
    keccak,
    secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey},
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

impl DidAccount {
    // TODO: Easy way to return a non-mutable reference to the data?
    fn verification_methods(&self) -> Vec<&VerificationMethod> {
        std::iter::once(&self.initial_verification_method)
            .chain(self.verification_methods.iter())
            .collect()
        // self.verification_methods.iter().collect()
    }

    pub fn add_verification_method(
        &mut self,
        verification_method: VerificationMethod,
    ) -> Result<()> {
        self.verification_methods.push(verification_method);
        Ok(())
    }

    pub fn remove_verification_method(&mut self, alias: &String) -> Result<()> {
        // default case
        if alias == &self.initial_verification_method.alias {
            self.initial_verification_method.flags = 0;
            return Ok(());
        }

        // general case
        let vm_length_before = self.verification_methods.len();
        self.verification_methods.retain(|x| x.alias != *alias);
        let vm_length_after = self.verification_methods.len();

        if vm_length_after != vm_length_before {
            Ok(())
        } else {
            Err(error!(DidSolError::VmDoesNotExists))
        }
    }

    pub fn has_verification_method(&self, alias: &String) -> bool {
        self.verification_methods()
            .iter()
            .any(|x| x.alias == *alias)
    }

    fn find_verification_method_match(
        &self,
        vm_type: VerificationMethodType,
        key: &[u8],
    ) -> Option<&VerificationMethod> {
        self.verification_methods()
            .into_iter()
            .filter(|x| x.method_type == vm_type.to_u8().unwrap())
            .filter(|x| {
                VerificationMethodFlags::from_bits(x.flags)
                    .unwrap()
                    .contains(VerificationMethodFlags::CAPABILITY_INVOCATION)
            })
            .find(|v| v.key_data == key)
    }

    pub fn has_authority_verification_methods(&self) -> bool {
        self.verification_methods()
            .into_iter()
            .filter(|x| VerificationMethodType::is_authority_type(x.method_type))
            .filter(|x| {
                VerificationMethodFlags::from_bits(x.flags)
                    .unwrap()
                    .contains(VerificationMethodFlags::CAPABILITY_INVOCATION)
            })
            .any(|_x| true) // TODO: there must be a nicer way here.
    }

    pub fn is_authority(&self, authority: Pubkey) -> bool {
        msg!(
            "Checking if {} is an Ed25519VerificationKey2018 authority",
            authority.to_string()
        );
        self.find_verification_method_match(
            VerificationMethodType::Ed25519VerificationKey2018,
            &authority.to_bytes(),
        )
        .is_some()
    }

    pub fn is_eth_authority(
        &self,
        message: Vec<u8>,
        raw_signature: Option<Secp256k1RawSignature>,
    ) -> bool {
        if raw_signature.is_none() {
            return false;
        }

        let raw_signature = raw_signature.unwrap();
        let message_with_nonce = [message.as_ref(), self.nonce.to_le_bytes().as_ref()].concat();
        // Ethereum conforming Message Input
        // https://docs.ethers.io/v4/api-utils.html?highlight=hashmessage#hash-function-helpers
        let sign_message_input = [
            "\x19Ethereum Signed Message:\n".as_bytes(),
            message_with_nonce.len().to_string().as_bytes(),
            message_with_nonce.as_ref(),
        ]
        .concat();

        let hash = keccak::hash(sign_message_input.as_ref());
        // msg!("Hash: {:x?}", hash.as_ref());
        // msg!("Message: {:x?}", message);
        // msg!(
        //     "sign_message_input: {:x?}, Length: {}",
        //     sign_message_input,
        //     sign_message_input.len()
        // );
        // msg!("Signature: {:x?}", raw_signature.signature);
        // msg!("RecoveryId: {:x}", raw_signature.recovery_id);

        let secp256k1_pubkey = secp256k1_recover(
            hash.as_ref(),
            raw_signature.recovery_id,
            raw_signature.signature.as_ref(),
        )
        .unwrap();
        // msg!("Recovered: {:?}", secp256k1_pubkey.to_bytes());
        //
        // // Check EcdsaSecp256k1VerificationKey2019 matches
        // msg!(
        //     "Checking if {:x?} is an EcdsaSecp256k1VerificationKey2019 authority",
        //     secp256k1_pubkey.to_bytes()
        // );
        if self
            .find_verification_method_match(
                VerificationMethodType::EcdsaSecp256k1VerificationKey2019,
                &secp256k1_pubkey.to_bytes(),
            )
            .is_some()
        {
            return true;
        }

        let address = convert_secp256k1pub_key_to_address(&secp256k1_pubkey);
        // msg!("Address: {:?}", address);
        // // Check EcdsaSecp256k1VerificationKey2019 matches
        // msg!(
        //     "Checking if {:x?} is an EcdsaSecp256k1RecoveryMethod2020 authority",
        //     address
        // );
        if self
            .find_verification_method_match(
                VerificationMethodType::EcdsaSecp256k1RecoveryMethod2020,
                &address,
            )
            .is_some()
        {
            return true;
        }

        false
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

// TODO Move
pub fn convert_secp256k1pub_key_to_address(pubkey: &Secp256k1Pubkey) -> [u8; 20] {
    let mut address = [0u8; 20];
    address.copy_from_slice(&keccak::hash(pubkey.to_bytes().as_ref()).to_bytes()[12..]);
    address
}

#[derive(
    Debug, AnchorSerialize, AnchorDeserialize, Copy, Clone, FromPrimitive, ToPrimitive, PartialEq,
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
    pub fn is_authority_type(vm_type: u8) -> bool {
        let vm_type = VerificationMethodType::from_u8(vm_type).unwrap();
        matches!(
            vm_type,
            VerificationMethodType::Ed25519VerificationKey2018
                | VerificationMethodType::EcdsaSecp256k1RecoveryMethod2020
                | VerificationMethodType::EcdsaSecp256k1VerificationKey2019
        )
    }
}

impl Default for VerificationMethodType {
    fn default() -> Self {
        VerificationMethodType::Ed25519VerificationKey2018
    }
}

/// The native authority key for a [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationMethod {
    /// alias
    pub alias: String,
    /// The permissions this key has
    pub flags: u16,
    /// The actual verification method
    pub method_type: u8, // Type: VerificationMethodType- Anchor does not yet provide mappings for enums
    /// Dynamically sized key matching the given VerificationType
    pub key_data: Vec<u8>,
}

impl VerificationMethod {
    pub fn size(&self) -> usize {
        4 + self.alias.len()
        + 2 // flags
        + 1 // method
        + 4 + self.key_data.len()
    }

    pub fn default(flags: VerificationMethodFlags, key_data: Vec<u8>) -> VerificationMethod {
        VerificationMethod {
            alias: String::from("default"),
            flags: flags.bits(),
            method_type: VerificationMethodType::default().to_u8().unwrap(),
            key_data,
        }
    }

    pub fn default_size() -> usize {
        4 + 7 // alias "default"
        + 2 // flags
        + 1 // method
        + 4 + 32 // ed25519 pubkey
    }
}

// impl From<VerificationMethodArg> for VerificationMethod {
//     fn from(item: VerificationMethodArg) -> Self {
//         VerificationMethod {
//             alias: item.alias,
//             flags: item.flags,
//             method_type: VerificationMethodType::from_u8(item.method_type).unwrap(),
//             key_data: item.key_data,
//         }
//     }
// }

// #[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
// pub struct VerificationMethodArg {
//     /// alias
//     pub alias: String,
//     /// The permissions this key has
//     /// TODO: DID-Powo via separate account. E.g. Requirement reverse key lookup.
//     pub flags: u16,
//     /// The actual verification method
//     pub method_type: u8, // Type: VerificationMethodType- Anchor does not yet provide mappings for enums
//     /// Dynamically sized key matching the given VerificationType
//     pub key_data: Vec<u8>,
// }

/// A Service Definition [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Service {
    pub id: String,
    pub service_type: String,
    pub service_endpoint: String,
}

impl Service {
    pub fn size(&self) -> usize {
        4 + self.id.len() + 4 + self.service_type.len() + 4 + self.service_endpoint.len()
    }
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct Secp256k1RawSignature {
    signature: [u8; 64],
    recovery_id: u8,
}

bitflags! {
    pub struct VerificationMethodFlags: u16 {
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
