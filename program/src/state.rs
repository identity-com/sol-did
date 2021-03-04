//! Program state
use {
    crate::error::SolidError,
    borsh::{BorshDeserialize, BorshSchema, BorshSerialize},
    regex::Regex,
    solana_program::{program_pack::IsInitialized, pubkey::Pubkey},
    std::str::FromStr,
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
    /// Sensible large default.  The sparse DID takes up ~450 bytes.
    pub const LEN: usize = 1_000;

    /// The context coming from SOLID
    pub const SOLID_CONTEXT: &'static str = "https://w3id.org/solid/v1";
    /// The default context from any DID
    pub const DID_CONTEXT: &'static str = "https://w3id.org/did/v1.0";

    /// Default context field on a SOLID
    pub fn default_context() -> Vec<String> {
        vec![
            Self::DID_CONTEXT.to_string(),
            Self::SOLID_CONTEXT.to_string(),
        ]
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

/// Enum representing the different clusters
/// TODO move this into solana-program?
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize, BorshSchema)]
pub enum ClusterType {
    /// Testnet / TDS, running the newest code
    Testnet,
    /// Mainnet, the part with real money
    MainnetBeta,
    /// Devnet, running the same code as Mainnet
    Devnet,
    /// Local network for development
    Development,
}

impl Default for ClusterType {
    fn default() -> Self {
        ClusterType::MainnetBeta
    }
}

impl ClusterType {
    /// Return the DID-compatible identifier, added after "did:solid:"
    pub fn did_identifier(&self) -> &str {
        match self {
            ClusterType::Testnet => "testnet",
            ClusterType::MainnetBeta => "",
            ClusterType::Devnet => "devnet",
            ClusterType::Development => "localnet",
        }
    }
}

impl FromStr for ClusterType {
    type Err = SolidError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "testnet" => Ok(ClusterType::Testnet),
            "" => Ok(ClusterType::MainnetBeta),
            "devnet" => Ok(ClusterType::Devnet),
            "localnet" => Ok(ClusterType::Development),
            _ => Err(SolidError::InvalidString),
        }
    }
}

/// Typed representation of a DistributedId
#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct DistributedId {
    /// Cluster the DID is hosted in (mainnet, testnet, devnet, or localnet)
    pub cluster_type: ClusterType,
    /// Ed25519 Public Key associated with the id
    pub pubkey: Pubkey,
    /// Additional identifier information
    pub identifier: String,
}

impl FromStr for DistributedId {
    type Err = SolidError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let re = Regex::new(r"did:solid:?(\w*):(\w+)#?(\w*)").unwrap();
        match re.captures(s) {
            Some(capture) => {
                let cluster_type = ClusterType::from_str(&capture[1])?;
                let pubkey = Pubkey::from_str(&capture[2])?;
                let identifier = capture[3].to_string();
                Ok(Self {
                    cluster_type,
                    pubkey,
                    identifier,
                })
            }
            None => Err(SolidError::InvalidString)
        }
    }
}

impl ToString for DistributedId {
    fn to_string(&self) -> String {
        format!(
            "{}:{}{}{}",
            Self::DEFAULT_DID_START,
            self.cluster(),
            self.pubkey,
            self.identifier()
        )
    }
}

impl DistributedId {
    /// All SOLID DIDs start with this.
    pub const DEFAULT_DID_START: &'static str = "did:solid";

    /// Create new DID when no additional identifier is specified
    pub fn new(cluster_type: ClusterType, pubkey: Pubkey) -> Self {
        Self {
            cluster_type,
            pubkey,
            identifier: "".to_string(),
        }
    }

    fn identifier(&self) -> String {
        if self.identifier.is_empty() {
            "".to_string()
        } else {
            format!("#{}", self.identifier)
        }
    }

    fn cluster(&self) -> String {
        match self.cluster_type {
            ClusterType::MainnetBeta => "".to_string(),
            _ => format!("{}:", self.cluster_type.did_identifier()),
        }
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
    /// TODO improve the key naming scheme.  Currently we just add on #key1
    pub const DEFAULT_KEY_ID: &'static str = "key1";

    /// The only possible verification type at the moment
    pub const DEFAULT_TYPE: &'static str = "Ed25519VerificationKey2018";

    /// Create a new verification method controlled by the given DID, and
    /// authenticated by the given Pubkey
    pub fn new(controller: DistributedId, pubkey: Pubkey) -> Self {
        let mut id = controller.clone();
        id.identifier = Self::DEFAULT_KEY_ID.to_string();
        Self {
            id,
            verification_type: Self::DEFAULT_TYPE.to_string(),
            controller,
            pubkey,
        }
    }
}

impl IsInitialized for SolidData {
    /// Is initialized
    fn is_initialized(&self) -> bool {
        self.context.iter().any(|e| e == Self::SOLID_CONTEXT)
            && self.context.iter().any(|e| e == Self::DID_CONTEXT)
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
        DistributedId::new(ClusterType::MainnetBeta, TEST_PUBKEY)
    }
    pub fn test_key_id() -> DistributedId {
        DistributedId {
            cluster_type: ClusterType::MainnetBeta,
            pubkey: TEST_PUBKEY,
            identifier: VerificationMethod::DEFAULT_KEY_ID.to_string(),
        }
    }
    pub fn test_verification_method() -> VerificationMethod {
        VerificationMethod {
            id: test_key_id(),
            verification_type: VerificationMethod::DEFAULT_TYPE.to_string(),
            controller: test_did(),
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
        assert_eq!(
            deserialized.did,
            DistributedId {
                cluster_type: ClusterType::Testnet,
                pubkey: Pubkey::new_from_array([0; 32]),
                identifier: "".to_string()
            }
        );
        assert_eq!(deserialized.public_key, vec![]);
        assert_eq!(deserialized.authentication, vec![]);
        assert_eq!(deserialized.capability_invocation, vec![]);
        assert_eq!(deserialized.key_agreement, vec![]);
        assert_eq!(deserialized.assertion, vec![]);
    }

    #[test]
    fn parse_did() {
        let valid_pubkey =
            Pubkey::from_str("FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP").unwrap();

        let valid = "did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";
        let did = DistributedId::from_str(&valid).unwrap();
        assert_eq!(did.cluster_type, ClusterType::Devnet);
        assert_eq!(did.pubkey, valid_pubkey);
        assert_eq!(did.identifier, "");

        let valid = "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";
        let did = DistributedId::from_str(&valid).unwrap();
        assert_eq!(did.cluster_type, ClusterType::MainnetBeta);
        assert_eq!(did.pubkey, valid_pubkey);
        assert_eq!(did.identifier, "");

        let valid = "did:solid:testnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1";
        let did = DistributedId::from_str(&valid).unwrap();
        assert_eq!(did.cluster_type, ClusterType::Testnet);
        assert_eq!(did.pubkey, valid_pubkey);
        assert_eq!(did.identifier, "key1");

        let valid = "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1";
        let did = DistributedId::from_str(&valid).unwrap();
        assert_eq!(did.cluster_type, ClusterType::MainnetBeta);
        assert_eq!(did.pubkey, valid_pubkey);
        assert_eq!(did.identifier, "key1");
    }

    #[test]
    fn parse_invalid_did() {
        // no did:solid
        let invalid = "solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";
        assert_eq!(
            DistributedId::from_str(&invalid).unwrap_err(),
            SolidError::InvalidString
        );

        // unknown network
        let invalid = "did:solid:mynetwork:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";
        assert_eq!(
            DistributedId::from_str(&invalid).unwrap_err(),
            SolidError::InvalidString
        );

        // bad pubkey
        let invalid = "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP111111";
        assert_eq!(
            DistributedId::from_str(&invalid).unwrap_err(),
            SolidError::InvalidString
        );
    }
}
