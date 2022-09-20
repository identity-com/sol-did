# legacy did:sol program and client.

This folder contains the legacy did program and client. DIDs in the legacy
program still resolve without any problem as long as they have not been
migrated to the new version.

## Legacy did:sol program
The legacy did:sol program is deployed to `idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM` 
on [devnet](https://explorer.solana.com/address/idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM?cluster=devnet)
and [mainnet](https://explorer.solana.com/address/idDa4XeCjVwKcprVAo812coUQbovSZ4kDGJf2sPaBnM).

## Legacy did:sol client
The legacy did:sol client is reexported in the current client under `LegacyClient`.
However it's additionally also available as a separate package here: 
[@identity.com/sol-did-client-legacy](https://www.npmjs.com/package/@identity.com/sol-did-client-legacy)
