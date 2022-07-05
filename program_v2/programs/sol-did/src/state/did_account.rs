use anchor_lang::prelude::*;

#[account]
pub struct DidAccount {
    /// Version identifier
    pub version: u8,
    /// Bump
    pub bump: u8,
    /// Nonce, for protecting against replay attacks around secp256k1 signatures.
    pub nonce: u64,
    /// All native verification keys
    pub verificationMethods: Vec<VerificationMethod>,
    /// TODO: Is there a general way to support other keys? (non-on-chain keys).
    /// Move that into a "free-text-extension" and merge back on client side.
    /// Services
    pub services: Vec<ServiceDefinition>,
    /// Controller (native) - did:sol:<controller>
    pub nativeControllers: Vec<Pubkey>,
    /// Controller (others) - all others
    pub otherControllers: Vec<String>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub enum VerificationMethodType {
    /// The main Ed25519Verification Method.
    /// https://w3c-ccg.github.io/lds-ed25519-2018/
    Ed25519VerificationKey2018(Pubkey),
    /// Verification Method for For 20-bytes Ethereum Keys
    EcdsaSecp256k1RecoveryMethod2020([u8; 20]),
    /// Verification Method for a full 32 bytes Secp256k1 Verification Key
    EcdsaSecp256k1VerificationKey2019([u8; 32]),
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
}

/// A Service Definition [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ServiceDefinition {
    /// The permissions this key has
    pub key: String,
    /// The eth wallet address
    pub value: String,
}
