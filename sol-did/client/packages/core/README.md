# `did:sol` Client

A typescript client library for registering, manipulating, and resolving DIDs
using the `did:sol` method.

## Disclaimer
With Version `^3.0.0`, the `@identity.com/sol-did-client` has been updated to use a new
authoritative program on the Solana blockchain (Address: `didso1...`). DIDs with a
persisted state with the legacy program `idDa4...` remains valid unless transferred
to the new program. The `did:sol` resolver will resolve DIDs in the following priority:

1. Persisted DID on `didso1...`
2. Persisted DID on `idDa4...`
3. Non persisted DID (results in a generative DID).

The version `<3.0.0` of the `sol-did-client` will remain available [@identity.com/sol-did-client-legacy
](https://www.npmjs.com/package/@identity.com/sol-did-client-legacy), but technically a
resolution with the legacy program no longer returns an authoritative result (since it
ignores the state of the new program). Therefore, to perform a DID resolution a library update is
strongly encouraged. The `legacy` did sol client is also exported in the new library as `LegacyClient`.

Please see below how to migrate your DIDs to the new program.

## Features
The `sol-did-client` library provides the following features:

1. A W3C [DID core spec (v1.0)](https://www.w3.org/TR/did-core/) compliant DID method and resolver operating on the Solana Blockchain.
2. TS Client and CLI for creating, manipulating, and resolving `did:sol`.
3. Generic Support for VerificationMethods of any Type and Key length.
4. Native on-chain support for `Ed25519VerificationKey2018`, `EcdsaSecp256k1RecoveryMethod2020` and `EcdsaSecp256k1VerificationKey2019`. This means DID state changes can be performed by only providing a valid secp256k1 signature to the program (it still requires a permissionless proxy).
5. On-Chain nonce protection for replay protection.
6. Dynamic (perfect) Solana account resizing for any DID manipulation.
7. Permissionless instruction to migrate any `did:sol` state to the new authoritative program.
8. A web-service driver, compatible with [uniresolver.io](https://unresolver.io) and [uniregistrar.io](https://uniregistrar.io).
9. A [did-io](https://github.com/digitalbazaar/did-io) compatible driver.
10. Based on the versatile [Anchor framework](https://github.com/coral-xyz/anchor).
11. Improved data model (`enum` for types and `bit-flags` for certain properties).
12. Introduced `OWNERSHIP_PROOF` to indicate that a Verification Method Key signature was verified on-chain.
13. Introduced `DID_DOC_HIDDEN` flag that enables hiding a Verification Method from the DID resolution.
14. Account Size can grow beyond transaction size limits (an improvement from the legacy program).


## Client library
### Installation
In the command line of the project folder, type the following and then press **Enter**:
```shell
yarn add @identity.com/sol-did-client #
```

or 

```shell
npm install @identity.com/sol-did-client
```

### Usage - Setup and Resolution

Use the following TypeScript code to complete the listed commands.

#### Create a Service

Create a service for a SOL-DID by using the following code snippet: 
```ts
  const authority = Keypair.generate();
  const cluster: ExtendedCluster = 'localnet';
  const didSolIdentifier = DidSolIdentifier.create(authority.publicKey, cluster);
  // create service for a did:sol:${authority.publicKey}
  const service = await DidSolService.build(didSolIdentifier);
```

### Resolving a DID:

Resolve a SOL-DID with the following code snippet: 
```ts
  const didDoc = await service.resolve();
  console.log(JSON.stringify(didDoc, null, 2));
```

### DID resolution information
`did:sol` DIDs are resolved in the following way:
1. `Generative` DIDs are DIDs that have no persisted DID data account. (e.g. every valid Solana Account/Wallet is in this state).
This will return a generative DID document where only the public key of the Account is a valid Verification Method.
2. `Persisted` DIDs are DIDs that have a persisted DID data account. Here the DID document represents the state that is found
on-chain.


## Usage - `did:sol` Manipulation
The following are instructions that can be executed against a DID.

When manipulating a DID, three elements are generally required:

1. An `authority`, a (native) Verification Method with a `Capability Invocation` flag, that is allowed to manipulate the DID.
2. A `fee payer`, a Solana account that covers the cost of the transaction execution.
3. A `(rent) payer`, a Solana account that covers an (eventual) initialization or resize of the DID data account.

Often, all of these entities are required for successful DID manipulation. However, when increasing the DID account size,
then only a `rent payer` is needed. In most cases, all three elements are represented by the same account, but this is
not a requirement. It is possible to implement a permissionless proxy that satisfies the fee payer and the rent payer to submit an authority-signed instruction/transaction to the chain. For example, a dApp might opt to pay fees to encourage user onboarding.


Generally, a manipulative DID operation has the following form:

```ts
service.OPERATION(...params) // returns the instance of the service to chain another operation
```

where each operation return as a builder that enables configuring certain aspects of how the operation is translated or
executed.

For example:
````ts
  await service
    .addVerificationMethod({
      fragment: 'eth-address',
      keyData: Buffer.from(ethAddress),
      methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: [VerificationMethodFlags.CapabilityInvocation, VerificationMethodFlags.Authentication],
    },
      nonAuthority.publicKey
    )
  .withAutomaticAlloc(nonAuthority.publicKey)
  .withPartialSigners(nonAuthority)
  .withSolWallet(feePayerWallet)
  .withEthSigner(authorityEthKey)
  .rpc();
````
adds a new Verification Method to the DID, and sets the authority (`1`) as `nonAuthority` (which in this example is actually
NOT a valid authority). It also uses `nonAuthority` as a `rent payer` (`3`) via `withAutomaticAlloc` and uses
`solWallet` as a Wallet interface signer of the transaction that covers the transaction fee (`2`).  Secondly, the
instruction is signed by `authorityEthKey` itself, which IS an actual authority (`1`) on the DID and permits the
update. Finally `rpc()` creates the instruction(s) and transaction and sends it to the chain. It is a terminal method
of the builder and needs to be awaited (returning a promise of the signature string).

Here's a breakdown of all exposed Builder functions:

1. `withAutomaticAlloc(payer: PublicKey): DidSolServiceBuilder`: Automatically enables a perfect resize of the DID data account.
    If required, this will generate an additional `initialize` or `resize` instruction that is executed before the actual 
    service instruction in order to bring the account to the required size.
2. `withEthSigner(ethSigner: EthSigner): DidSolServiceBuilder`: Allows to set an `EthSigner` e.g. as provided by [ethers](https://docs.ethers.io/v5/api/signer/#Signer-signMessage).
   This signs all (supported) instructions with the provided signMessage interface, which needs to adhere to [EIP-191](https://eips.ethereum.org/EIPS/eip-191).
   If the DID contains a matching Verification Method of type `EcdsaSecp256k1RecoveryMethod2020` or `EcdsaSecp256k1VerificationKey2019` (with a Capability Invocation flag),
   no Solana Authority (`1`) is required.
3. `withConnection(connection: Connection): DidSolServiceBuilder`: Overrides the Solana Connection used for `rpc()`.
4. `withConfirmOptions(confirmOptions: ConfirmOptions): DidSolServiceBuilder` Overrides the Solana ConfirmationOptions used for `rpc()`.
5. `withSolWallet(solWallet: Wallet): DidSolServiceBuilder` Allows overriding the Solana Wallet interface that is used to sign the transaction within `rpc()`.
6. `withPartialSigners(...signers: Signer[]): DidSolServiceBuilder`: Sets partialSigners to sign the transaction in `rpc()`.
7. `async rpc(opts?: ConfirmOptions): Promis e<string>`: Terminal method that creates the instruction(s), builds and signs the transaction, and sends it to the chain. Furthermore, it translates the chain-specific error code into a human-readable error message.
8. `async transaction(): Promise<Transaction>`: Terminal method that creates the instruction(s), and builds the transaction (Eth signing will be applied if applicable, but no Solana Transaction handling is performed).
9. `async instructions(): Promise<TransactionInstruction[]>`: Terminal method that creates and returns the instruction(s) (Eth signing will be applied if applicable).

### Changing of DID Operations
`DidSolService` allows chaining multiple operations one after another. For example:
```ts
    await service
      .removeService('service-4', nonAuthoritySigner.publicKey) // remove
      .addService({
        fragment: 'service-5',
        serviceType: 'service-type-5',
        serviceEndpoint: 'http://localhost:3005',
      }, true, nonAuthoritySigner.publicKey) // update
      .addService({
        fragment: 'service-6',
        serviceType: 'service-type-6',
        serviceEndpoint: 'http://localhost:3006',
      }, false, nonAuthoritySigner.publicKey) // add
      .withEthSigner(ethAuthority1)
      .withSolWallet(nonAuthorityWallet)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .rpc();
```
This operation chains one(1) `removeService` and two(2) `addService` operations that are signed
by and `ethSigner` and optionally resizes the account. 

### Init a DID Account
All DID operations can be performed with `withAutomaticAlloc(payer: PublicKey)`, which automatically creates a DID data account of the required size. However, the API still supports manually initializing a DID account of any size. Allocating an account upfront that is large enough for future modifications might prevent the need to use payers for subsequent operations. However, allocating a larger account increases the rent fees for that account.

```ts
  await service.initialize(1_000, payer.publicKey).rpc();
```
The `initialize` operation does not support  `withAutomaticAlloc` OR `withEthSigner`. Using `initialize` without an
argument will set the default DID authority as `payer` and size it to the minimal initial size required.

### Resize a DID Account
Generally, all DID operations can be performed with `withAutomaticAlloc(payer: PublicKey)`, which automatically creates or resizes a DID data account of the required size. However, the API also supports manually resizing a DID account of any size.

```ts
  await service.resize(1_500, payer.publicKey).rpc();
```
The `resize` operation does not support `withAutomaticAlloc`. Using `initialize` without an argument will set the default DID authority as `payer`.

### Add a Verification Method
This operation adds a new Verification Method to the DID. The `keyData` can be a generically sized `UInt8Array`, but logically it must match the `methodType` specified.

```ts
    await service.addVerificationMethod({
      fragment: 'eth-address',
      keyData: Buffer.from(ethAddress),
      methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: [VerificationMethodFlags.CapabilityInvocation, VerificationMethodFlags.Authentication],
    })
  .withAutomaticAlloc(authority.publicKey)
  .rpc();
```

### Remove a Verification Method
This code removes a Verification Method with the given `fragment` from the DID. It is important to keep at least one valid Verification Method with a Capability Invocation flag to prevent a lockout.

```ts
  await service
  .removeVerificationMethod('eth-address')
  .withAutomaticAlloc(authority.publicKey)
  .rpc();
```

### Set flags of a Verification Method
This sets/updates the flag on an existing VerificationMethod. **Important** if the flag contains `VerificationMethodFlags.OwnershipProof`
this transaction MUST use the same authority as the Verification Method. (e.g. proving that the owner can sign with
that specific VM). `VerificationMethodFlags.OwnershipProof` is supported for the following `VerificationMethodTypes`:
- `Ed25519VerificationKey2018`
- `EcdsaSecp256k1RecoveryMethod2020`
- `EcdsaSecp256k1VerificationKey2019`

In this example, the 'default" VM must match the `authority.publicKey`.

```ts
  await service
    .setVerificationMethodFlags('default', 
      [VerificationMethodFlags.CapabilityInvocation, VerificationMethodFlags.OwnershipProof], 
      authority.publicKey)
    .withAutomaticAlloc(authority.publicKey)
    .rpc();
```

### Add a Service
This operation sets a new service on a DID. `serviceType` are strings, not enums, and can therefore be freely defined.

```ts
  await service
    .addService(
      {
        fragment: 'service-1',
        serviceType: 'service-type-1',
        serviceEndpoint: 'http://localhost:3000',
      })
    .rpc();
```

### Remove a Service
This operation removes a service with the given `fragment` name from the DID.

```ts
  await service.removeService('service-1')
    .withAutomaticAlloc(nonAuthority.publicKey)
    .rpc();
```

### Update the controllers of a DID
This operation sets/updates the controllers of a DID. This overwrites any existing controllers.

```ts
  await service
    .setControllers([
      `did:sol:localnet:${Keypair.generate().publicKey.toBase58()}`,
      `did:ethr:${EthWallet.createRandom().address}`,
    ])
    .withAutomaticAlloc(authority.publicKey)
    .rpc();
```
Technically `did:sol` controllers are verified to be valid Solana Account Keys and stored accordingly, while all other
types of controller DID are persisted as strings.

### Update all properties of a DID
This operation allows for bulk updates of all changeable properties of a DID.
Please note, that this is a more destructive operation and should be handled with care. Furthermore, by overwriting all Verification Methods it removes ANY existing `VerificationMethodFlags.OwnershipProof`,
which are not allowed to be specified within the bulk update.

```ts
    await service
      .update({
        controllerDIDs: [
          `did:sol:localnet:${Keypair.generate().publicKey.toBase58()}`,
          `did:ethr:${EthWallet.createRandom().address}`,
        ],
        services: [
          {
            fragment: 'service-1',
            serviceType: 'service-type-1',
            serviceEndpoint: 'http://localhost:3000',
          },
          {
            fragment: 'service-2',
            serviceType: 'service-type-2',
            serviceEndpoint: 'http://localhost:3001',
          }
        ],
        verificationMethods: [
          {
            fragment: 'default',
            keyData: authority.publicKey.toBytes(),
            methodType: VerificationMethodType.Ed25519VerificationKey2018,
            flags: [VerificationMethodFlags.CapabilityInvocation, VerificationMethodFlags.Authentication],
          },
          {
            fragment: 'eth-address',
            keyData: Buffer.from(ethAddress),
            methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
            flags: [VerificationMethodFlags.CapabilityInvocation, VerificationMethodFlags.Authentication],
          }
        ],
      })
    .withAutomaticAlloc(authority.publicKey)
    .rpc();
```
The `default` Verification Method can never be removed, therefore not setting it within the update Method will cause all flags to be removed from it.

### Update all properties of a DID with a DID Document
This operation allows for bulk updates of all changeable properties of a DID by passing an existing DidSolDocument.This is a destructive operation and should be handled with care. Furthermore, by overwriting all Verification Methods it removes ANY existing  `VerificationMethodFlags.OwnershipProof`,
which are not allowed to be specified within the bulk update.

```ts
    const document = DidSolDocument.fromDoc(
      {
        "@context": [
          "https://w3id.org/did/v1.0",
          "https://w3id.org/sol/v2.0"
        ],
        "id": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a",
        "controller": [
          "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3"
        ],
        "verificationMethod": [
          {
            "id": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a#default",
            "type": "Ed25519VerificationKey2018",
            "controller": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a",
            "publicKeyBase58": "LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a"
          },
          {
            "id": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a#ledger",
            "type": "Ed25519VerificationKey2018",
            "controller": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a",
            "publicKeyBase58": "A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3"
          }
        ],
        "authentication": [],
        "assertionMethod": [],
        "keyAgreement": [],
        "capabilityInvocation": [
          "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a#default",
          "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a#ledger"
        ],
        "capabilityDelegation": [],
        "service": [
          {
            "id": "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a#test784378",
            "type": "testType784378",
            "serviceEndpoint": "testEndpoint784378"
          }
        ]
      });

    await service
      .updateFromDoc(document)
      .withAutomaticAlloc(legacyAuthority.publicKey)
      .rpc();
```

### Close a DID Account
This transaction closes a DID account, reverting it to its generative state.

```ts
  await service.close(rentDestination.publicKey).rpc();
```

The rent for the DID data account will be return to `rentDestination`. Closing a DID account requires using an `AuthoritySigner`.

### Migrate a persisted legacy DID to the new Program
Legacy DIDs resolve without issues with the current `did:sol` resolver, however, if you want to migrate a legacy DID (e.g. to use the new features), you can do so with the following code:

In order to migrate a DID the following requirements need to be met:
- Persisted DID data account in the legacy program.
- **No** persisted DID data account in the new program (e.g. DID was not migrated already).

If no persisted state exists on either program it is a `generative` DID that does not need migration.
The prerequisites can be checked with `await service.isMigratable()`.

The actual migration is done the following way:
```ts
// check if DID in service can be migrated.
const canMigrate = await service.isMigratable()

if (canMigrate) {
  // migrate DID
  await service
    .migrate(nonAuthoritySigner.publicKey, legacyAuthority.publicKey)
    .withPartialSigners(nonAuthoritySigner)
    .withSolWallet(legacyAuthorityWallet)
    .rpc();
}
```
Note, that the migrate function works with a `nonAuthoritySigner`, e.g. that means ANYONE
can migrate any DID to the new program. However, the migration keeps the state, costs no more rent, and adds functionality, so no harm is done through the DID migration. Since legacy DIDs often automatically allocated a lot of space and new migrated DIDs are optimally space efficient, the migration to a new DID can actually save SOL.
In this example, however, 
`nonAuthoritySigner` is the `rent payer` for the new account.

In this example, migrate takes an optional `legacyAuthority` argument. If specified, it closes
the legacy DID account automatically and recovers the rent to the `rent payer` of the new
account (`nonAuthoritySigner` in this example). This action can only be done by an AuthoritySigner, which protects the owner’s rent payer fees from being stolen.


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
Also, install Anchor by using the information found [here](https://book.anchor-lang.com/getting_started/installation.html)

```shell
anchor test
```
