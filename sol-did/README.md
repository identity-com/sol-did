# `did:sol` Program

The [anchor-based](https://github.com/coral-xyz/anchor) program of `did:sol` on Solana.

## is_authority Integration
Other programs can check if a verification method (e.g. public key or address) by integrating `is_authority`:

```rust
use sol_did::integrations::is_authority;
```

```rust
// pub fn is_authority(did_account: &AccountInfo, 
//                     did_account_seed_bump: Option<u8>, 
//                     controlling_did_accounts: &[AccountInfo], 
//                     key: &[u8], 
//                     filter_types: Option<&[VerificationMethodType]>, 
//                     filter_fragment: Option<&String>) -> Result<bool>
```

## Instructions

### `initialize`
Arguments:
- size: `u32`

Accounts:
- didData `isMut`
- authority `isSigner`, `isMut`
- payer `isSigner`, `isMut`
- systemProgram 

### `resize`
Arguments:
- size:`u32`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`
- payer `isSigner`, `isMut`
- systemProgram

### `close`
Arguments:
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`
- destination `isMut`
- systemProgram

### `add_verification_method`
Arguments:
- verificationMethod:`VerificationMethod`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `remove_verification_method`
Arguments:
- fragment:`string`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `add_service`
Arguments:
- service:`Service`
- allowOverwrite:`bool`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `remove_service`
Arguments:
- fragment:`string`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `set_vm_flags`
Arguments:
- flagsVm:`UpdateFlagsVerificationMethod`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `set_controllers`
Arguments:
- setControllersArg:`SetControllersArg`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `update`
Arguments:
- updateArg:`UpdateArg`
- ethSignature:`Option<Secp256k1RawSignature>`

Accounts:
- didData `isMut`
- authority `isSigner`

### `migrate`
Arguments:

Accounts:
- didData `isMut`
- authority
- payer `isSigner`, `isMut`
- legacyDidData
- systemProgram

### Deployments

- Mainnet-beta: [didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc](https://explorer.solana.com/address/didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc)
- Devnet: [didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc](https://explorer.solana.com/address/didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc?cluster=devnet)
- Testnet: TODO...

### APR Reference

- `did:sol` program on [APR](https://www.apr.dev/program/didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc)

