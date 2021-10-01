//! Program state
use {
    crate::{error::SolError, id},
    borsh::{BorshDeserialize, BorshSchema, BorshSerialize},
    solana_program::{program_pack::IsInitialized, pubkey::Pubkey},
    std::str::FromStr,
};

fn merge_vecs<T: PartialEq>(lhs: &mut Vec<T>, rhs: Vec<T>) {
    for v in rhs.into_iter() {
        if !lhs.contains(&v) {
            lhs.push(v);
        }
    }
}

/// Struct wrapping data and providing metadata
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct SolData {
    /// The version of the account for (de)serialization
    pub account_version: u8,
    /// The public key of the solData account - used to derive the identifier
    /// and first verification method
    pub authority: Pubkey,

    /// DecentralizedIdentifier version - used to generate the DID JSON-LD context:
    /// ["https://w3id.org/did/v1.0", "https://w3id.org/sol/v" +  version]
    pub version: String,
    /// List of controllers of this did, using the key of the did
    pub controller: Vec<Pubkey>,

    /// All of the public keys related to the DecentralizedIdentifier
    pub verification_method: Vec<VerificationMethod>,
    /// TODO
    pub authentication: Vec<String>,
    /// Currently the most important part, decides which ID gets to do things
    pub capability_invocation: Vec<String>,
    /// TODO
    pub capability_delegation: Vec<String>,
    /// TODO
    pub key_agreement: Vec<String>,
    /// TODO
    pub assertion_method: Vec<String>,
    /// Services that can be used with this DID
    pub service: Vec<ServiceEndpoint>,
}
impl Default for SolData {
    fn default() -> Self {
        Self {
            account_version: Self::VALID_ACCOUNT_VERSION,
            authority: Default::default(),
            version: Default::default(),
            controller: Default::default(),
            verification_method: Default::default(),
            authentication: Default::default(),
            capability_invocation: Default::default(),
            capability_delegation: Default::default(),
            key_agreement: Default::default(),
            assertion_method: Default::default(),
            service: Default::default(),
        }
    }
}

impl SolData {
    /// The only valid value for `account_version`
    pub const VALID_ACCOUNT_VERSION: u8 = 1;
    /// Default size of struct
    pub const DEFAULT_SIZE: usize = 1_000;
    /// The SOL DID method version
    pub const DEFAULT_VERSION: &'static str = "1";

    /// Create a DID for this DIDDocument
    pub fn did(&self) -> DecentralizedIdentifier {
        DecentralizedIdentifier {
            sol_data: self,
            url_field: "".to_string(),
        }
    }

    /// Create a new SOL for testing write capabilities
    /// The verification methods and capability invocation arrays
    /// are inferred from the authority
    pub fn new_sparse(authority: Pubkey) -> Self {
        Self {
            account_version: Self::VALID_ACCOUNT_VERSION,
            authority,
            version: Self::DEFAULT_VERSION.to_string(),
            controller: vec![],
            verification_method: vec![],
            authentication: vec![],
            capability_invocation: vec![],
            capability_delegation: vec![],
            key_agreement: vec![],
            assertion_method: vec![],
            service: vec![],
        }
    }

    /// Infers a set of verification methods by combining:
    /// 1. The authority
    /// 2. the explicit verification methods stored in the document
    pub fn inferred_verification_methods(&self) -> Vec<VerificationMethod> {
        let default_verification_method = VerificationMethod::new_default(self.authority);
        let mut combined_vector = vec![default_verification_method];

        combined_vector.extend(self.verification_method.iter().cloned());

        combined_vector
    }

    /// Infers a set of capability invocations from either:
    /// 1. The authority
    /// 2. the explicit capability invocations stored in the document
    /// By default, the authority is also the key that is allowed to update or delete the DID,
    /// However, if an explicit capability invocation list is specified, this can be overruled,
    /// allowing revocability of lost keys while retaining the original DID identifier (which is
    /// derived from the authority)
    pub fn inferred_capability_invocation(&self) -> Vec<String> {
        if !self.capability_invocation.is_empty() {
            return self.capability_invocation.clone();
        }

        return vec![VerificationMethod::DEFAULT_KEY_ID.to_string()];
    }

    /// Get the list of pubkeys that can update the document
    pub fn write_authorized_pubkeys(&self) -> Vec<Pubkey> {
        let inferred_capability_invocation_keys = self.inferred_capability_invocation();
        self.inferred_verification_methods()
            .iter()
            .filter(|v| inferred_capability_invocation_keys.contains(&v.id))
            .map(|v| v.pubkey)
            .collect()
    }
    /// Merge one DID into another.  The ID does not change, exact copies
    pub fn merge(&mut self, other: SolData) {
        if !other.version.is_empty() {
            self.version = other.version
        }
        merge_vecs(&mut self.controller, other.controller);
        merge_vecs(&mut self.verification_method, other.verification_method);
        merge_vecs(&mut self.authentication, other.authentication);
        merge_vecs(&mut self.capability_invocation, other.capability_invocation);
        merge_vecs(&mut self.capability_delegation, other.capability_delegation);
        merge_vecs(&mut self.key_agreement, other.key_agreement);
        merge_vecs(&mut self.assertion_method, other.assertion_method);
        merge_vecs(&mut self.service, other.service);
    }

    #[cfg(test)]
    pub fn rand_data(rng: &mut (impl rand::RngCore + rand::CryptoRng)) -> Self {
        use rand::Rng;
        use solana_sdk::signature::{Keypair, Signer};
        let verification_method = (1..rng.gen_range(1, 11))
            .map(|_| VerificationMethod::rand_data(rng))
            .collect::<Vec<_>>();
        Self {
            account_version: Self::VALID_ACCOUNT_VERSION,
            authority: Keypair::generate(rng).pubkey(),
            version: Self::DEFAULT_VERSION.to_string(),
            controller: vec![],
            authentication: Self::rand_from_vm(rng, &verification_method),
            capability_invocation: Self::rand_from_vm(rng, &verification_method),
            capability_delegation: Self::rand_from_vm(rng, &verification_method),
            key_agreement: Self::rand_from_vm(rng, &verification_method),
            assertion_method: Self::rand_from_vm(rng, &verification_method),
            service: vec![],
            verification_method,
        }
    }

    #[cfg(test)]
    fn rand_from_vm(
        rng: &mut (impl rand::RngCore + rand::CryptoRng),
        verification_method: &[VerificationMethod],
    ) -> Vec<String> {
        use rand::Rng;
        use std::collections::HashSet;
        (0..rng.gen_range(0, verification_method.len() + 1))
            .map(|_| {
                verification_method[rng.gen_range(0, verification_method.len())]
                    .id
                    .clone()
            })
            .collect::<HashSet<_>>()
            .into_iter()
            .collect()
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
    /// Return the DID-compatible identifier, added after "did:sol:"
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
    type Err = SolError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "testnet" => Ok(ClusterType::Testnet),
            "" => Ok(ClusterType::MainnetBeta),
            "devnet" => Ok(ClusterType::Devnet),
            "localnet" => Ok(ClusterType::Development),
            _ => Err(SolError::InvalidString),
        }
    }
}

/// Get program-derived sol address for the authority
pub fn get_sol_address_with_seed(authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[&authority.to_bytes(), br"sol"], &id())
}

/// Typed representation of a DecentralizedIdentifier
#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct DecentralizedIdentifier<'a> {
    /// A reference to the DID Document that this identifier belongs to
    pub sol_data: &'a SolData,
    /// Additional url information
    pub url_field: String,
}

impl<'a> DecentralizedIdentifier<'a> {
    /// Create new DID when no additional identifier is specified
    pub fn new(sol_data: &'a SolData) -> Self {
        Self {
            sol_data,
            url_field: "".to_string(),
        }
    }
}

/// Struct for the service endpoint related to a DID
#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct ServiceEndpoint {
    /// Id related to the endpoint
    /// When the DID document is resolved, this is concatenated to the DID to produce
    /// did:sol:<identifier>#<id>
    pub id: String,
    /// Endpoint type
    pub endpoint_type: String,
    /// The actual URL of the endpoint
    pub endpoint: String,
    /// More info about the endpoint
    pub description: String,
}

/// Struct for the verification method
#[derive(Clone, Debug, Default, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct VerificationMethod {
    /// Unique id for the verification method, and how to find it
    /// When the DID document is resolved, this is concatenated to the DID to produce
    /// did:sol:<identifier>#<id>
    pub id: String,
    /// What kind of key this is. TODO use an enum?
    pub verification_type: String,
    /// The associated pubkey itself
    pub pubkey: Pubkey,
}

impl VerificationMethod {
    /// The identifier for a default verification method, i.e one inferred from the
    /// authority
    pub const DEFAULT_KEY_ID: &'static str = "default";

    /// The only possible verification type at the moment
    pub const DEFAULT_TYPE: &'static str = "Ed25519VerificationKey2018";

    /// Create a new verification method controlled by the given DID, and
    /// authenticated by the given Pubkey, with the default ID
    pub fn new_default(pubkey: Pubkey) -> Self {
        Self::new(pubkey, Self::DEFAULT_KEY_ID.to_string())
    }

    /// Create a new verification method controlled by the given DID, and
    /// authenticated by the given Pubkey
    pub fn new(pubkey: Pubkey, id: String) -> Self {
        Self {
            id,
            verification_type: Self::DEFAULT_TYPE.to_string(),
            pubkey,
        }
    }

    #[cfg(test)]
    pub fn rand_data(rng: &mut (impl rand::RngCore + rand::CryptoRng)) -> Self {
        use rand::Rng;
        use solana_sdk::signature::{Keypair, Signer};
        Self {
            id: (10..128)
                .map(|_| rng.gen_range(b'a', b'z' + 1) as char)
                .collect(),
            verification_type: Self::DEFAULT_TYPE.to_string(),
            pubkey: Keypair::generate(rng).pubkey(),
        }
    }
}

impl IsInitialized for SolData {
    /// Is initialized
    fn is_initialized(&self) -> bool {
        !self.version.is_empty()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::borsh as program_borsh;

    /// Pubkey for tests
    pub const TEST_PUBKEY: Pubkey = Pubkey::new_from_array([100; 32]);
    /// DID for tests
    pub const TEST_KEY_ID: &str = "did:sol:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1";
    /// Controller for tests
    pub const TEST_DID: &str = "did:sol:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP";

    pub fn test_did(sol_data: &'static SolData) -> DecentralizedIdentifier {
        DecentralizedIdentifier::new(sol_data)
    }

    pub fn test_verification_method() -> VerificationMethod {
        VerificationMethod {
            id: VerificationMethod::DEFAULT_KEY_ID.to_string(),
            verification_type: VerificationMethod::DEFAULT_TYPE.to_string(),
            pubkey: TEST_PUBKEY,
        }
    }

    pub fn test_sol_data() -> SolData {
        SolData {
            account_version: SolData::VALID_ACCOUNT_VERSION,
            authority: TEST_PUBKEY,
            version: SolData::DEFAULT_VERSION.to_string(),
            verification_method: vec![test_verification_method()],
            controller: vec![],
            authentication: vec![VerificationMethod::DEFAULT_KEY_ID.to_string()],
            capability_invocation: vec![VerificationMethod::DEFAULT_KEY_ID.to_string()],
            capability_delegation: vec![],
            key_agreement: vec![],
            assertion_method: vec![],
            service: vec![],
        }
    }

    #[test]
    fn serialize_data() {
        let data = test_sol_data();
        let serialized = data.try_to_vec().unwrap();
        let deserialized = SolData::try_from_slice(&serialized).unwrap();
        assert_eq!(data, deserialized);
    }

    #[test]
    fn deserialize_empty() {
        let data = [0u8; SolData::DEFAULT_SIZE];
        let deserialized = program_borsh::try_from_slice_incomplete::<SolData>(&data).unwrap();
        assert_eq!(deserialized.version, "");
        assert_eq!(deserialized.verification_method, vec![]);
        assert_eq!(deserialized.authentication, vec![] as Vec<String>);
        assert_eq!(deserialized.capability_invocation, vec![] as Vec<String>);
        assert_eq!(deserialized.capability_delegation, vec![] as Vec<String>);
        assert_eq!(deserialized.key_agreement, vec![] as Vec<String>);
        assert_eq!(deserialized.assertion_method, vec![] as Vec<String>);
        assert_eq!(deserialized.service, vec![]);
    }
}
