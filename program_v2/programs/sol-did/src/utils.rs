use crate::constants::DID_SOL_PREFIX;
use solana_program::keccak;
use solana_program::secp256k1_recover::Secp256k1Pubkey;

pub fn convert_secp256k1pub_key_to_address(pubkey: &Secp256k1Pubkey) -> [u8; 20] {
    let mut address = [0u8; 20];
    address.copy_from_slice(&keccak::hash(pubkey.to_bytes().as_ref()).to_bytes()[12..]);
    address
}

// pub fn is_valid_did(did: &str) -> bool {
//     lazy_static! {
//         static ref DID_RE: Regex = Regex::new(r"^did:([a-z0-9:]*):([a-zA-z\d]+)$").unwrap();
//     }
//     DID_RE.is_match(did)
// }

pub fn is_did_sol_prefix(did: &str) -> bool {
    did.starts_with(DID_SOL_PREFIX)
}

pub fn check_other_controllers(controllers: &[String]) -> bool {
    controllers.iter().all(|did| !is_did_sol_prefix(did))
}
