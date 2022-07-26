# SOL DID Client 

A typescript client library for registering, manipulating and resolving DIDs
using the `did:sol` method.

## Disclaimer
With Version `^3.0.0`, the `@identity.com/sol-did-client` has been updated to use a new
authoritive program on the Solana blockchain (Address: `didso1...`). DIDs that have a
persisted state with the legacy program `idDa4...` remain valid unless they are transferred
to the new program. The `did:sol` resolver will resolve DIDs with the following priority:

1. Persisted DID on `didso1...`
2. Persisted DID on `idDa4...`
3. Non persisted DID (results generative DID).

The version `<3.0.0` of the `sol-did-client` will remain available [@identity.com/sol-did-client-legacy
](https://www.npmjs.com/package/@identity.com/sol-did-client-legacy), but technically a
resolution with the legacy program does no longer return an authoritive result. (Since it
ignores the state of the new program). Therefore, for DID resolution a library update is
strongly encouraged.

## Features
The `sol-did-client` library provides the following features:

1. A W3C [DID core spec (v1.0)](https://www.w3.org/TR/did-core/) compliant DID method and resolver operating on the Solana Blockchain
2. TS Client and CLI for creating, manipulating, resolving `did:sol`.
3. Generic Support for VerificationMethods of any Type and Key length.
4. Native on-chain support for `Ed25519VerificationKey2018`, `EcdsaSecp256k1RecoveryMethod2020` and `EcdsaSecp256k1VerificationKey2019`. This means DID state changes can be performed by solely providing a valid secp256k1 signature to the program. (It still requires a permissionless proxy).
5. On-Chain nonce protection for replay protection.
6. Dynamic (perfect) Solana account resizing for any DID manipulation.
7. Permissionless instruction to migrate any `did:sol` state to the new authoritive program.
8. A web-service driver, compatible with [uniresolver.io](https://unresolver.io) and [uniregistrar.io](https://uniregistrar.io)
9. A [did-io](https://github.com/digitalbazaar/did-io) compatible driver
10. Based on the versatile [anchor framework](https://github.com/coral-xyz/anchor).
11. Improved data model (`enum` for types and `bit-flags` for certain properties.)
12. Introduced `OWNERSHIP_PROOF` to indicate that a Verification Method Key signature was verified on-chain.
13. Introduced `DID_DOC_HIDDEN` flag that allows to hide a Verification Method from the DID resolution.
14. Account Size can grow beyond transaction size limits (improvement from legacy program).


## Command line tool
The client library comes with a command line tool `sol` that allows to resolve and manipulate
DIDs.

### Installation
```shell
yarn global add @identity.com/sol-did-client # or npm install -g @identity.com/sol-did-client
```
### Usage

#### Resolve a DID
```shell
sol did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa # resolves a DID on mainnet-beta
...
sol did:sol:devnet:6fjuEFDTircJVNCQWYe4UHNfbYrU1a4sEr8FQ5w7d8Fx # resovles a DID on devnet
````


## Client library
### Installation
In TS/JS project:
```shell
yarn add @identity.com/sol-did-client # or npm install @identity.com/sol-did-client
```

### Usage - Setup and Resolution

#### Create a Service

[//]: # (TODO: This should be updated after Andrews branch makes it in)
```ts
  const authority = Keypair.generate();
  const cluster: ExtendedCluster = 'localnet';

  // create service for a did:sol:${authority.publicKey}
  const service = await DidSolService.build(
    authority.publicKey,
    cluster,
    new NodeWallet(authority)
  );
```
Note, a service downloads the IDL for the anchor program dynamically from Chain. Therefore
if the program works with other DIDs on the same cluster, a new services should be created
from an existing one:

```ts
  const anotherAuthority = Keypair.generate();
  const anotherService = await service.build(anotherAuthority.publicKey, new NodeWallet(anotherAuthority))
```

### Resolving a DID:
```ts
  const didDoc = await service.resolve();
  console.log(JSON.stringify(didDoc, null, 2));
```

## Usage - `did:sol` Manipulation
The following are all instructions that can be executed against a DID.

### Init a DID Account

### Resize a DID Account

### Add a Verification Method

### Remove a Verification Method

### Set flags of a Verification Method

### Add a Service

### Remove a Service

### Update the controllers of a DID

### Update all properties of a DID


## Contributing

Note: Before contributing to this project, please check out the code of conduct and contributing guidelines.

Sol-DID uses [nvm](https://github.com/nvm-sh/nvm) and [yarn](https://yarnpkg.com/)

```shell
nvm i
yarn
```

## Running the tests

### E2E tests

Install Solana locally by following the steps described [here](https://docs.solana.com/cli/install-solana-cli-tools).
Also install Anchor by using the information found [here](https://book.anchor-lang.com/getting_started/installation.html)

```shell
anchor test
```

