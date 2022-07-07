use anchor_lang::prelude::*;
use num_derive::*;
use num_traits::*;
use bitflags::bitflags;

#[account]
pub struct DidAccount {
    /// Version identifier
    pub version: u8,
    /// Bump
    pub bump: u8,
    /// Nonce, for protecting against replay attacks around secp256k1 signatures.
    pub nonce: u64,
    /// The initial authority key, automatically being added to the array of all Verification Methods.
    pub initial_authority: Pubkey,
    /// the VM flags for the initial authority key
    pub initial_authority_flags: u16,
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
    fn verification_methods(&self) -> Vec<VerificationMethod> {
        let ret_vector = vec![VerificationMethod {
            alias: String::from("default"),
            flags: self.initial_authority_flags,
            method: Default::default(),
            key_data: self.initial_authority.to_bytes().to_vec(),
        }];

        [ret_vector.as_slice(), self.verification_methods.as_slice()].concat()
    }

    pub fn add_verification_method(&mut self, verification_method: VerificationMethod) {
        self.verification_methods.push(verification_method);
    }

    pub fn is_authority(&self, authority: Pubkey) -> bool {
        // TODO: Filter for VM type (e.g. key agreement etc)
        msg!("Checking if {} is an authority", authority.to_string());
        let ret = self.verification_methods()
            .iter()
            .any(|v| v.key_data == authority.to_bytes());

        ret
    }

    pub fn size(&self) -> usize {
        1 // version
        + 1 // bump
        + 8 // nonce
        + 32 // initial_authority
        + 2 // initial_authority_flags
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
        + 32 // initial_authority
        + 2 // initial_authority_flags
        + 4 // verification_methods
        + 4 // services
        + 4 // native_controllers
        + 4 // other_controllers
    }
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, FromPrimitive, ToPrimitive)]
pub enum VerificationMethodType {
    /// The main Ed25519Verification Method.
    /// https://w3c-ccg.github.io/lds-ed25519-2018/
    Ed25519VerificationKey2018,
    /// Verification Method for For 20-bytes Ethereum Keys
    EcdsaSecp256k1RecoveryMethod2020,
    /// Verification Method for a full 32 bytes Secp256k1 Verification Key
    EcdsaSecp256k1VerificationKey2019,
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
    pub method: VerificationMethodType,
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
}

impl From<VerificationMethodArg> for VerificationMethod {
    fn from(item: VerificationMethodArg) -> Self {
        VerificationMethod {
            alias: item.alias,
            flags: item.flags,
            method: VerificationMethodType::from_u8(item.method).unwrap(),
            key_data: item.key_data,
        }
    }
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationMethodArg {
    /// alias
    pub alias: String,
    /// The permissions this key has
    /// TODO: DID-Powo via separate account. E.g. Requirement reverse key lookup.
    pub flags: u16,
    /// The actual verification method
    pub method: u8, // Type: VerificationMethodType- Anchor does not yet provide mappings for enums
    /// Dynamically sized key matching the given VerificationType
    pub key_data: Vec<u8>,
}

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

