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
Execute script (`demo/1-add-vm.ts`):
```bash
yarn ts-node scripts/demo/1-add-vm.ts
```
-> Check that new Key is applied to the DID Document via did.civic.com.

5. Add a service to a DID with the ED25519 Key from (4.) as authority
```bash
yarn ts-node scripts/demo/2-add-service-new-key.ts
```

6. Adding a Verification Method with an ETH Address to a DID.
  - Generate an `secp256k1` private key in Metamask and export it to the script(s)
```bash
yarn ts-node scripts/demo/3-add-vm-eth.ts 
```

7. Add a service to a DID with the `secp256k1` Key from (6.) as authority
  - Update private key to match the one from 6.
```bash
yarn ts-node scripts/demo/4-add-service-new-eth-key.ts 
```

8. Add controllers to the DID (with the default authority from (1.))
```bash
yarn ts-node scripts/demo/5-add-controllers.ts
```

9. Set Verification Method Flags of the Ethereum Verification Method from (6.).
  - Important, one can ONLY set the ownership flag if the key itself is a signer of the tx (e.g. the eth key signs)
  - Point out that the Ownership flag is currently NOT exposed in the DID document. (since it's not part of the DID Doc standard)
  - We are considering to add the Ownership flag as an extension
```bash
yarn ts-node scripts/demo/6-set-vm-flags.ts
```

10. Talk about Solana Transaction costs.
  - 5000 Lamports per transaction
  - X Lamports rent for account size. (Point to examples in explorer.solana.com)
