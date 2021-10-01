# SOL-DID Solana Program

Register DID documents on the Solana blockchain using the SOL DID method

Solana mainnet address: `idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM`

## Build & Deploy

### Getting started:

See the 
[Solana documentation](https://docs.solana.com/developing/on-chain-programs/developing-rust)
for developing Rust programs.

### Building:

    cargo build-bpf

### Deploying:

    solana program deploy <REPO_HOME>/sol-did/program/target/deploy/sol_did.so

The program is deployed on Mainnet at address:

    idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM
    
## Using in other programs

Given an arbitrary account `acc`, owned by a DID,
Check if a signer is a valid owner of A using:

```rust
use sol_did::validate_owner;

fn check_authority(authority_info: &AccountInfo, did: &AccountInfo, acc: &MyAccount) -> ProgramResult {
  if !(acc.owner.eq(did.key)) {
    msg!("Incorrect authority provided");
    Err(MyError::IncorrectAuthority.into())
  }

  validate_owner(did, &[&authority_info])
}
```
