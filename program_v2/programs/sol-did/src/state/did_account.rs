use anchor_lang::prelude::*;

#[account]
pub struct DidAccount {
    /// Version identifier
    pub version: u8,
    /// Bump
    pub bump: u8,
    /// All native verification keys
    pub nativeVerificationKeys: Vec<NativeDidVerificationKey>,
    /// All EthWallet verification addresses
    // pub ethVerificationKeys: Vec<EthWalletDidVerificationKey>,
    /// TODO: Is there a general way to support other keys? (non-on-chain keys).
    /// Move that into a "free-text-extension" and merge back on client side.
    /// Services
    pub services: Vec<ServiceDefinition>,
    /// Controller (native) - did:sol:<controller>
    pub nativeControllers: Vec<Pubkey>,
    /// Controller (others) - all others
    pub otherControllers: Vec<String>,
}

impl DidAccount {
    pub fn on_chain_size_with_arg(self) -> usize {
        // TODO.
        0
    }
}

/// The native authority key for a [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct NativeDidVerificationKey {
    /// alias
    pub alias: String,
    /// The permissions this key has
    /// TODO: DID-Powo via separate account. E.g. Requirement reverse key lookup.
    pub flags: u16,
    /// The key
    pub key: Pubkey,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct EthWallet(pub(crate) [u8; 20]);

/// The eth wallet authority address for a [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct EthWalletDidVerificationKey {
    /// alias
    pub alias: String,
    /// The permissions this key has
    /// TODO: DID-Powo via separate account. E.g. Requirement reverse key lookup.
    pub flags: u16,
    /// The eth wallet address
    pub key: EthWallet,
}

/// A Service Definition [`DidAccount`]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct ServiceDefinition {
    /// The permissions this key has
    pub key: String,
    /// The eth wallet address
    pub value: String,
}
