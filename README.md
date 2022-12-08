# did:sol

Welcome to the `did:sol` Method monorepo.

Solana is a high-speed, low-fee public ledger based on a novel Proof-of-History consensus network.
The SOL DID method is a method for storing DIDs and managing DID documents on Solana.

This repository contains:

- The [did:sol Method spec](https://identity-com.github.io/sol-did/did-method-spec.html)
- The [did:sol solana program](/sol-did/programs/sol-did)
- An [auto-generated IDL](/sol-did/client/packages/idl) for supporting anchor program interfacing to the on-chain program
- A [Typescript client](/sol-did/client/packages/core) for creating, updating, resolving and deleting SOL DIDs
- A [CLI](/sol-did/client/packages/cli) for creating, updating, resolving and deleting SOL DIDs via the CLI


Drivers:
- DIDs: A [client library](drivers/dids) that supports SOL and did-key 
- A web-service [driver](drivers/uniresolver), compatible with [uniresolver.io](https://unresolver.io) and [uniregistrar.io](https://uniregistrar.io)
- A [did-io](https://github.com/digitalbazaar/did-io) compatible [driver](drivers/did-io)

Testing