use anchor_lang::prelude::*;
use num_derive::*;
use num_traits::*;

#[account]
// #[derive(Default)]
pub struct DidAccount {
    /// Version identifier
    pub version: u8,
    /// Bump
    pub bump: u8,
    /// Nonce, for protecting against replay attacks around secp256k1 signatures.
    pub nonce: u64,
    /// The initial authority key, automatically being added to the array of all Verification Methods.
    pub initial_authority: Pubkey,
    /// All native verification keys
    pub verification_methods: Vec<VerificationMethod>,
    /// all ethereum verification methods

    /// TODO: Is there a general way to support other keys? (non-on-chain keys).
    /// Move that into a "free-text-extension" and merge back on client side.
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
            flags: 0,
            method: Default::default(),
            key_data: self.initial_authority.to_bytes().to_vec(),
        }];

       [ret_vector.as_slice(), &self.verification_methods.as_slice()].concat()
    }

    pub fn add_verification_method(&mut self, verification_method: VerificationMethod) {
        self.verification_methods.push(verification_method);
    }

    pub fn size(&self) -> usize {
        1 // version
        + 1 // bump
        + 8 // nonce
        + 32 // initial_authority
        + 4 + &self.verification_methods.iter().fold(0, | accum, item| { accum + item.size() }) // verification_methods
        + 4 + &self.services.iter().fold(0, | accum, item| { accum + item.size() }) // services
        + 4 + &self.native_controllers.len() * 32 // native_controllers
        + 4 + &self.other_controllers.iter().fold(0, | accum, item| { accum + 4 + item.len() }) // other_controllers
    }

    pub fn initial_size() -> usize {
        1 // version
        + 1 // bump
        + 8 // nonce
        + 32 // initial_authority
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
    /// TODO: DID-Powo via separate account. E.g. Requirement reverse key lookup.
    pub flags: u16,
    /// The actual verification method
    pub method: VerificationMethodType,
    /// Dynamically sized key matching the given VerificationType
    pub key_data: Vec<u8>,
}

impl VerificationMethod {
    pub fn size(&self) -> usize {
        4 + &self.alias.len()
        + 2 // flags
        + 1 // method
        + 4 + &self.key_data.len()
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
        4 + &self.id.len()
        + 4 + &self.service_type.len()
        + 4 + &self.service_endpoint.len()
    }
}
