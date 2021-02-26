//! Program state
use {
    borsh::{BorshDeserialize, BorshSchema, BorshSerialize},
    solana_program::{program_pack::IsInitialized, pubkey::Pubkey},
};

/// Struct wrapping data and providing metadata
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct SolidData {
    /// DistributedId context, defaults to:
    /// ["https://w3id.org/did/v1.0", "https://w3id.org/solid/v1"]
    pub context: Vec<String>,

    /// the DistributedId for this document
    pub did: DistributedId,

    /// All of the public keys related to the DistributedId
    pub public_key: Vec<VerificationMethod>,
    /// TODO
    pub authentication: Vec<DistributedId>,
    /// TODO
    pub capability_invocation: Vec<DistributedId>,
    /// TODO
    pub key_agreement: Vec<DistributedId>,
    /// TODO
    pub assertion: Vec<DistributedId>,
}

impl SolidData {
    /// Sensible large default.  The sparse DistributedId takes up ~450 bytes.
    pub const LEN: usize = 1_000;
    /// Default context field on a SOLID
    pub fn default_context() -> Vec<String> {
        vec![DID_CONTEXT.to_string(), SOLID_CONTEXT.to_string()]
    }
    /// Create a new SOLID for testing write capabilities
    pub fn new(did: DistributedId, authority: Pubkey) -> Self {
        let verification_method = VerificationMethod::new(did.clone(), authority);
        let verification_id = verification_method.id.clone();
        Self {
            context: Self::default_context(),
            did,
            public_key: vec![verification_method],
            authentication: vec![verification_id.clone()],
            capability_invocation: vec![verification_id.clone()],
            key_agreement: vec![verification_id.clone()],
            assertion: vec![verification_id],
        }
    }
}

/// The context coming from SOLID
pub const SOLID_CONTEXT: &str = "https://w3id.org/solid/v1";
/// The default context from any DID
pub const DID_CONTEXT: &str = "https://w3id.org/did/v1.0";
/// The only possible verification type at the moment
pub const VERIFICATION_TYPE: &str = "Ed25519VerificationKey2018";

/// Typed representation of a DistributedId
#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct DistributedId(String);
impl From<String> for DistributedId {
    fn from(s: String) -> Self {
        DistributedId(s)
    }
}

/// All SOLID DIDs start with this. TODO add the cluster name after
pub const DEFAULT_DID_START: &str = "did:solid";
/// TODO improve the key naming scheme.  Currently we just add on #key1
pub const DEFAULT_VERIFICATION_METHOD_ID: &str = "#key1";

impl From<Pubkey> for DistributedId {
    fn from(pubkey: Pubkey) -> Self {
        DistributedId(format!("{}:{}", DEFAULT_DID_START, pubkey))
    }
}

/// Struct for the verification method
#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct VerificationMethod {
    /// Unique id for the verification method, and how to find it
    pub id: DistributedId,
    /// What kind of key this is. TODO use an enum?
    pub verification_type: String,
    /// The DID that controls the verification method
    pub controller: DistributedId,
    /// The associated pubkey itself
    pub pubkey: Pubkey,
}

impl VerificationMethod {
    /// Create a new verification method controlled by the given DID, and
    /// authenticated by the given Pubkey
    pub fn new(controller: DistributedId, pubkey: Pubkey) -> Self {
        let mut id = controller.0.clone();
        id.push_str(DEFAULT_VERIFICATION_METHOD_ID);
        Self {
            id: DistributedId(id),
            verification_type: VERIFICATION_TYPE.to_string(),
            controller,
            pubkey,
        }
    }
}

impl IsInitialized for SolidData {
    /// Is initialized
    fn is_initialized(&self) -> bool {
        self.context.iter().any(|e| e == SOLID_CONTEXT) && self.context.iter().any(|e| e == DID_CONTEXT)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::borsh as program_borsh;

    /// Pubkey for tests
    pub const TEST_PUBKEY: Pubkey = Pubkey::new_from_array([100; 32]);
    /// DID for tests
    pub const TEST_KEY_ID: &str = "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1";
    /// Controller for tests
    pub const TEST_DID: &str = "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";
    pub fn test_did() -> DistributedId {
        TEST_DID.to_string().into()
    }
    pub fn test_key_id() -> DistributedId {
        TEST_KEY_ID.to_string().into()
    }
    pub fn test_verification_method() -> VerificationMethod {
        VerificationMethod {
            id: test_key_id(),
            verification_type: VERIFICATION_TYPE.to_string(),
            controller: TEST_DID.to_string().into(),
            pubkey: TEST_PUBKEY,
        }
    }

    pub fn test_solid_data() -> SolidData {
        SolidData {
            context: SolidData::default_context(),
            did: test_did(),
            public_key: vec![test_verification_method()],
            authentication: vec![test_key_id()],
            capability_invocation: vec![test_key_id()],
            key_agreement: vec![test_key_id()],
            assertion: vec![test_key_id()],
        }
    }

    #[test]
    fn serialize_data() {
        let data = test_solid_data();
        let serialized = data.try_to_vec().unwrap();
        let deserialized = SolidData::try_from_slice(&serialized).unwrap();
        assert_eq!(data, deserialized);
    }

    #[test]
    fn deserialize_empty() {
        let data = [0u8; SolidData::LEN];
        let deserialized = program_borsh::try_from_slice_incomplete::<SolidData>(&data).unwrap();
        assert_eq!(deserialized.context, vec![] as Vec<String>);
        assert_eq!(deserialized.did, DistributedId("".to_string()));
        assert_eq!(deserialized.public_key, vec![]);
        assert_eq!(deserialized.authentication, vec![]);
        assert_eq!(deserialized.capability_invocation, vec![]);
        assert_eq!(deserialized.key_agreement, vec![]);
        assert_eq!(deserialized.assertion, vec![]);
    }
}
