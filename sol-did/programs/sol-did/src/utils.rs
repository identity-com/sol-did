use crate::constants::DID_SOL_PREFIX;
use crate::{id, DID_ACCOUNT_SEED};
use anchor_lang::prelude::*;
use lazy_static::lazy_static;
use regex::Regex;
use solana_program::keccak;
use solana_program::secp256k1_recover::{
    secp256k1_recover, Secp256k1Pubkey, Secp256k1RecoverError,
};

pub fn convert_secp256k1pub_key_to_address(pubkey: &Secp256k1Pubkey) -> [u8; 20] {
    let mut address = [0u8; 20];
    address.copy_from_slice(&keccak::hash(pubkey.to_bytes().as_ref()).to_bytes()[12..]);
    address
}

pub fn derive_did_account(authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[DID_ACCOUNT_SEED.as_bytes(), authority.key().as_ref()],
        &id(),
    )
}

pub fn derive_did_account_with_bump(authority: &Pubkey, bump_seed: u8) -> Result<Pubkey> {
    Pubkey::create_program_address(
        &[
            DID_ACCOUNT_SEED.as_bytes(),
            authority.key().as_ref(),
            &[bump_seed],
        ],
        &id(),
    )
    .map_err(|_| Error::from(ErrorCode::ConstraintSeeds))
}

pub fn is_did_sol_prefix(did: &str) -> bool {
    did.starts_with(DID_SOL_PREFIX)
}

pub fn check_other_controllers(controllers: &[String]) -> bool {
    controllers.iter().all(|did| !is_did_sol_prefix(did))
}

pub fn normalize_did_cluster(did: &str) -> String {
    DID_CLUSTER_RE.replace_all(did, "${1}").to_string()
}

/// Returns the address that signed message producing signature.
pub fn eth_verify_message(
    message: &[u8],
    nonce: u64,
    signature: [u8; 64],
    recovery_id: u8,
) -> core::Result<Secp256k1Pubkey, Secp256k1RecoverError> {
    let message_with_nonce = [message, nonce.to_le_bytes().as_ref()].concat();
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

    let secp256k1_pubkey = secp256k1_recover(hash.as_ref(), recovery_id, signature.as_ref());
    // msg!("Recovered: {:?}", secp256k1_pubkey.to_bytes());
    //
    // // Check EcdsaSecp256k1VerificationKey2019 matches
    // msg!(
    //     "Checking if {:x?} is an EcdsaSecp256k1VerificationKey2019 authority",
    //     secp256k1_pubkey.to_bytes()
    // );
    secp256k1_pubkey
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_did_cluster() {
        let clusterless_did = "did:sol:12345";
        assert_eq!(
            normalize_did_cluster("did:sol:devnet:12345"),
            clusterless_did
        );
        assert_eq!(
            normalize_did_cluster("did:sol:localnet:12345"),
            clusterless_did
        );
        assert_eq!(normalize_did_cluster(clusterless_did), clusterless_did)
    }
}