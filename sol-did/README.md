# `did:sol` Program

The [anchor-based](https://github.com/coral-xyz/anchor) program of `did:sol` on Solana.

## Creating DIDs

*Any Solana public key can be a DID.* This means that if you have a public key `abc`, then that key
corresponds to the decentralized identifier `did:sol:abc`.

This DID is called a `generative` DID, because it is generated from a public key, and has no other information associated with it.

Generative DIDs have one authority, which is the public key itself (`abc` in this case).

## Adding information to DIDs

In order to add more authorities, or any other information to the DID, it must be initialised on chain,
using the `initialize` instruction.

Once a DID is initialized, other keys can be added to it using the `add_verification_method` instruction.

## DID Accounts

The information for a DID is stored on a `DID Account`, a PDA that is derived from the DID identifier.

In order to derive the PDA for any DID, the following function is used:

```rust
use sol_did::integrations::derive_did_account;

let (did_account, bump) = derive_did_account(key.to_bytes())
```

Where `key` is the identifier of the DID (`abc` in the above case)

In order to reduce the amount of calculations that are needed to derive the DID account,
you can pass the `bump` value as a parameter:

```rust
use sol_did::integrations::derive_did_account_with_bump;

let did_account = derive_did_account_with_bump(key.to_bytes(), bump)?;
```

Note, in this case, the function returns a Result, in case the bump value is incorrect.

## Checking if a key is an authority on a DID

In order to use DIDs in your program, add the DID account to your instruction accounts list.

The DID account is the that stores the DID information. Note: this can be `generative` (see above).

To check if a key is an authority of a DID, use the `is_authority` instruction.

```rust
use sol_did::integrations::is_authority;

let signer_owns_did = is_authority(
    &did_account,
    None,
    &[],
    &signer.to_bytes(),
    None,
    None
);
```

This function works in the generative and non-generative case. In the generative case, the did_account
must be owned by the system program.

## Controller relationship

One DID can be a `controller` of another DID.

If a key `a` is an authority on `did:sol:abc`, and `did:sol:abc` is a controller of `did:sol:def`
then the following `is_authority` relationship is true:

```rust
use sol_did::integrations::is_authority;

let signer_owns_did = is_authority(
    &abc_account,
    None,
    &[(def_account_info, def)],
    &abc.to_bytes(),
    None,
    None
);
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

