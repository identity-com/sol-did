### did:sol IIW Walkthrough

1. Quick background about did:sol.
- Official did method on Solana. 
  - [Registry](https://w3c.github.io/did-spec-registries/#did-methods)
  - [Spec](https://g.identity.com/sol-did/)
  - [CLI](https://www.npmjs.com/package/@identity.com/sol-did-cli)
- Demo Resolver (did.civic.com)[https://did.civic.com/]

2. Generate a new did:sol
- did:sol **generative** on an ed25519 Pubkey (which used by Solana)
```bash
solana-keygen new -o test.json

Wrote new keypair to test.json
===========================================================================
pubkey: C817BQbvCxWTtcsE1ADPxoumD76zt3Znw6ykjrPVYuUd
===========================================================================
```
- Now you automatically have a `did:sol` with `did:sol:devnet:C817BQbvCxWTtcsE1ADPxoumD76zt3Znw6ykjrPVYuUd`
- The `did:sol` convention allows to specify the network via an additional keyword e.g.
  - `did:sol:...`: Mainnet-beta
  - `did:sol:devnet:...`: Devnet
  - `did:sol:testnet:...`: Testnet
3. (Airdrop some SOL to your account). This is done automatically in the demo scripts.

4. Adding a Verification Method to a DID.
Execute script (`demo/add-vm.ts`):
```bash
yarn ts-node scripts/demo/add-vm.ts
```

5. Check that new Key is applied to the DID Document via did.civic.com.

