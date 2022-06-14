# did:sol

Welcome to the `did:sol` Method monorepo.

Solana is a high-speed, low-fee public ledger based on a novel Proof-of-History consensus network.
The SOL DID method is a method for storing DIDs and managing DID documents on Solana.

This repository contains:

- The [did:sol Method spec](https://identity-com.github.io/sol-did/did-method-spec.html)
- The [did:sol solana program](/program)
- A [Typescript client](/client) for creating, updating, resolving and deleting SOL DIDs

Drivers:
- DIDs: A [client library](drivers/dids) that supports SOL and did-key 
- A web-service [driver](drivers/uniresolver), compatible with [uniresolver.io](https://unresolver.io) and [uniregistrar.io](https://uniregistrar.io)
- A [did-io](https://github.com/digitalbazaar/did-io) compatible [driver](driver/did-io)
