use crate::constants::{DID_PREFIX, DID_SOL_PREFIX};
use crate::{id, DID_ACCOUNT_SEED};
use anchor_lang::prelude::{Error, ErrorCode};
use solana_program::keccak;
use solana_program::pubkey::Pubkey;
use solana_program::secp256k1_recover::{
    secp256k1_recover, Secp256k1Pubkey, Secp256k1RecoverError,
};

pub fn convert_secp256k1pub_key_to_address(pubkey: &Secp256k1Pubkey) -> [u8; 20] {
    let mut address = [0u8; 20];
    address.copy_from_slice(&keccak::hash(pubkey.to_bytes().as_ref()).to_bytes()[12..]);
    address
}

pub fn is_did_sol_prefix(did: &str) -> bool {
    did.starts_with(DID_SOL_PREFIX)
}

pub fn is_did_prefix(did: &str) -> bool {
    did.starts_with(DID_PREFIX)
}

pub fn check_other_controllers(controllers: &[String]) -> bool {
    controllers
        .iter()
        .all(|did| is_did_prefix(did) && !is_did_sol_prefix(did))
}

/// Returns the address that signed message producing signature.
pub fn eth_verify_message(
    message: &[u8],
    nonce: u64,
    signature: [u8; 64],
    recovery_id: u8,
) -> Result<Secp256k1Pubkey, Secp256k1RecoverError> {
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

pub fn derive_did_account(key: &[u8]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[DID_ACCOUNT_SEED.as_bytes(), key], &id())
}

pub fn derive_did_account_with_bump(key: &[u8], bump_seed: u8) -> Result<Pubkey, Error> {
    Pubkey::create_program_address(&[DID_ACCOUNT_SEED.as_bytes(), key, &[bump_seed]], &id())
        .map_err(|_| Error::from(ErrorCode::ConstraintSeeds))
}
