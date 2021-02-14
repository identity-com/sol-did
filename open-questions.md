# SOLID Implementation Open Questions

## What is the difference between the publicKeys and Authentication sections?

"publicKeys" is used for referencing from other sources, see e.g. here. https://w3c.github.io/did-core/#authentication.
You can define a key once, then reuse it in the different "verificationMethod" sections, such as authentication, keyAgreement etc.
Note, this means the verificationMethod sections have the type Array<String | Key>, not sure if that would be a problem. We could simplify this on-chain if needed.

## Who gets to update a DID?

Referencing the [DID specification](https://www.w3.org/TR/did-core/#capability-invocation):

> The capabilityInvocation verification relationship is used to specify a verification method that might be used by the DID subject to invoke a cryptographic capability, such as the authorization to update the DID Document or the authorization to access an HTTP API.

SOLID DIDs use the capabilityInvocation verification method to validate whether a transaction signer
has permission to update a DID. These keys must therefore have types:

- Ed25519VerificationKey2018

or

- X25519KeyAgreementKey2019

Note: Later on, having support for a DID "controller" separate to the DID itself will be necessary, to allow for DIDs representing institutions, buildings, children etc.

## DID method

The DID method for DIDs resolved on Solana is "solid".

## DID method identifier

In a DID like did:solid:abcde, the DID method identifier is the `abcde`.

An example Solid DID: `did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP`

TODO: Add a real resolvable example once one exists.

The method identifier in SOLID is a Solana [Program Address](https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses)
which is derived by hashing the owner address, program ID and a "bump seed" which ensures the resultant
address cannot clash with the account address space (which lie on the Curve25519 elliptic curve).

The program ID is published for each chain. The bump seed is deterministically derivable off-chain as follows:

```pseudocode
Initialize the seed to 256 (2^8-1)
Do:
  Decrement the seed by 1
  Hash the owner address, program ID, and seed 
While the resultant point is not on the Curve25519 curve
```

See [here](https://docs.solana.com/developing/programming-model/calling-between-programs#hash-based-generated-program-addresses)
for more details.

SOLID Method identifiers therefore follow the same syntax as Solana program addresses, in that they
are an EC-256 (256-bit) public key encoded in Base58 and have length between 31 and 44 characters. (TODO check this)

### Non-mainnet DIDs

DIDs registered on [clusters](https://docs.solana.com/clusters) other than Solana mainnet have their cluster name as a prefix.

```
did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP  // mainnet
did:solid:testnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP // testnet
did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP // devnet
```

## DID Creation

Here's my proposal for an initial creation API:

Anyone can create a DID for anyone else. This may have change later on for security reasons i.e. if you own the private key, you must have been the one to create the DID, but I think it is safe for now.

DID creation has the following inputs:

```
new DID(owner: PublicKey, content: DIDDocument)
```

The DID method identifier should be created from the owner public key (see above).

Both inputs are optional. If the owner is missing, the owner is the signer of the TX (i.e. creating a DID for yourself)
The content can be missing. In that case a "sparse DID" will be created, which will look like this:

```
{
  "@context": [
    "https://w3id.org/did/v1.0",
    "https://w3id.org/solid/v1"
  ],
  "id": "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP",
  "publicKeys": [
    {
      "id": "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP",
      "publicKeyBase58": "BeqWbk3sPvujQgBySrwUbinjtXc1oAfg3iD87ShtVrKb"
    }
  ],
  "authentication": [
    "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1"
  ],
  "capabilityInvocation": [
    "did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP#key1"
  ]
}
```

If the content property is not missing, it should be JSON that matches the DID spec.

If there is a capabilityInvocation` section, there should be at least one key, this is the 'owner' key.

The `@context` section is optional, and defaults to the value in the exammple above if not present.

Regarding validation:

* on the program side, the deserialization logic takes care of validation -- the data provided must be deserialized into a DID struct before saving
* on the client side, the JS library could accept any JSON and automatically validate while attempting to convert it to the program's binary format before sending it off
* This is limiting at first, but then we're sure of every field provided.  We can expand to more / optional fields in a later version.

## DID Editing & Revocation

The program should accept an edit to a DID document signed by any private key if the public key for this private key
exists in or is referenced in the [capabilityInvocation](https://www.w3.org/TR/did-core/#capability-invocation) block.

## Cost

### Registering a DID Document 

Registering a DID Document on Solana costs [rent](https://docs.solana.com/implemented-proposals/rent).

Details of rent calculation can be found [here](https://docs.solana.com/developing/programming-model/accounts#calculation-of-rent).  

The size of a DID document in bytes depends on the space reserved for
its [account](https://docs.solana.com/developing/programming-model/accounts#creating).

The current DID Document program reserves space for five public keys, five serviceEndpoints and five references
to keys in each validationMethod, resulting in a document size of 4-5kb in uncompressed JSON form, and ~3kb
(TODO verify after initial version is released) on-chain.

As a rule of thumb, rent costs ~3.5 SOL per mebibyte/year, so 3kb amounts to ~0.01 SOL per year.

To permanently store a DID on Solana, it can be made rent-exempt, by storing a minimum balance of 2 years of rent
against the account. 
