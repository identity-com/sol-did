use crate::constants::VM_DEFAULT_FRAGMENT_NAME;
use crate::state::{DidAccount, VerificationMethodFlags, VerificationMethodType};
use crate::{Service, VerificationMethod};
use anchor_lang::prelude::*;
use anchor_lang::{AccountDeserialize, AccountSerialize, Owner};
use borsh::BorshDeserialize;
use num_traits::*;
use std::str::FromStr;

#[derive(Clone, BorshDeserialize)]
pub struct LegacyServiceEndpoint {
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

#[derive(Clone, BorshDeserialize)]
pub struct LegacyVerificationMethod {
    /// Unique id for the verification method, and how to find it
    /// When the DID document is resolved, this is concatenated to the DID to produce
    /// did:sol:<identifier>#<id>
    pub id: String,
    /// What kind of key this is. TODO use an enum?
    pub verification_type: String,
    /// The associated pubkey itself
    pub pubkey: Pubkey,
}

#[derive(Clone, BorshDeserialize)]
pub struct LegacyDidAccount {
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
    pub verification_method: Vec<LegacyVerificationMethod>,
    pub authentication: Vec<String>,
    /// Currently the most important part, decides which ID gets to do things
    pub capability_invocation: Vec<String>,
    pub capability_delegation: Vec<String>,
    pub key_agreement: Vec<String>,
    pub assertion_method: Vec<String>,
    /// Services that can be used with this DID
    pub service: Vec<LegacyServiceEndpoint>,
}

impl LegacyDidAccount {
    pub fn migrate(&self, into: &mut DidAccount, bump: u8) -> Result<()> {
        let default_flags = self.get_flags(&VM_DEFAULT_FRAGMENT_NAME.to_string());
        into.init(bump, &self.authority, default_flags);
        let migrated = self.migrate_verification_methods();
        into.set_verification_methods(migrated)?;
        let migrated = self.migrate_services();
        into.set_services(migrated)?;
        into.set_native_controllers(self.controller.clone())?;

        // TODO: Documentation
        // pub version: String,
        // pub account_version: u8, unhandled

        Ok(())
    }

    fn migrate_verification_methods(&self) -> Vec<VerificationMethod> {
        self.verification_method
            .iter()
            .map(|vm| VerificationMethod {
                fragment: vm.id.clone(),
                method_type: VerificationMethodType::Ed25519VerificationKey2018
                    .to_u8()
                    .unwrap(),
                flags: self.get_flags(&vm.id).bits(),
                key_data: vm.pubkey.to_bytes().to_vec(),
            })
            .collect()
    }

    fn get_flags(&self, vm_fragment: &String) -> VerificationMethodFlags {
        let mut flags = VerificationMethodFlags::NONE;
        msg!("Migrating flags for {}", vm_fragment);
        if self.authentication.contains(vm_fragment) {
            flags |= VerificationMethodFlags::AUTHENTICATION;
        }
        if self.assertion_method.contains(vm_fragment) {
            flags |= VerificationMethodFlags::ASSERTION;
        }
        if self.capability_invocation.contains(vm_fragment) {
            flags |= VerificationMethodFlags::CAPABILITY_INVOCATION;
        }
        if self.capability_delegation.contains(vm_fragment) {
            flags |= VerificationMethodFlags::CAPABILITY_DELEGATION;
        }
        if self.key_agreement.contains(vm_fragment) {
            flags |= VerificationMethodFlags::KEY_AGREEMENT;
        }

        msg!("Migrating flags for {:#b}", flags.bits());

        flags
    }

    fn migrate_services(&self) -> Vec<Service> {
        self.service
            .iter()
            .map(|se| {
                Service {
                    fragment: se.id.clone(),
                    service_type: se.endpoint_type.clone(),
                    service_endpoint: se.endpoint.clone(),
                    // TODO: Documentation NOTE, Descriptions will be dropped
                    // service_description: se.description.clone(),
                }
            })
            .collect()
    }
}

impl AccountDeserialize for LegacyDidAccount {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        // Deserialize whole account (without discriminator)
        AnchorDeserialize::deserialize(buf).map_err(|_| ErrorCode::AccountDidNotDeserialize.into())
    }
}

impl AccountSerialize for LegacyDidAccount {}

impl Owner for LegacyDidAccount {
    fn owner() -> Pubkey {
        // TODO: Make static
        Pubkey::from_str("idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM").unwrap()
    }
}
