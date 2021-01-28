h1. SOLID Implementation Open questions

h2. What is the difference between the publicKeys and Authentication sections?

"publicKeys" is used for referencing from other sources, see e.g. here. https://w3c.github.io/did-core/#authentication.
You can define a key once, then reuse it in the different "verificationMethod" sections, such as authentication, keyAgreement etc.
Note, this means the verificationMethod sections have the type Array<String | Key>, not sure if that would be a problem. We could simplify this on-chain if needed.
Who gets to update a DID?
Regarding authorization for updating a DID Document, this is what the spec says:
Determining the authority of a party to carry out the operations is method-specific. For example, a DID method might:
- make use of the controller property.
- use the verification methods listed under authentication to decide whether an update/deactivate operation is allowed.
- use other constructs in the DID Document to decide if, for example, a verification method specified under capabilityInvocation could be used to verify the invocation of a capability to update the DID Document.
- not use the DID Document at all to decide this, but have rules that are "built into" the method.

Since we are going for a "v1" DID program to get started, I would suggest either:
1. "use the verification methods listed under authentication to decide whether an update/deactivate operation is allowed."
This matches what we discussed yesterday, i.e. find all keys under "authentication" where the type is "Ed25519VerificationKey2018" (TODO is this type correct?). If the tx signer is in the list, allow the update.
or
22. not use the DID Document at all to decide this, but have rules that are "built into" the method.
This would be basically the TokenAccount pattern, i.e. define a solana publicKey as the owner of the Account that stores the DID. Presumably this key would also be referenced in the DID Document.

I would be strongly in favour of option 1.

Later on, having support for a DID "controller" separate to the DID itself will be necessary, to allow for DIDs representing institutions, buildings, children etc.

h2. DID method

At the moment I am calling our DID method "solid" because it is cool. :) This may change though. Any opinions?

h2. DID method identifier

In a DID like did:solid:abcde, the DID method identifier is the abcde.

The recommendation is that DID methods identifiers are cryptographically derivable from the user's public key, but not equal to it.
I don't want to rush the decision of how this is calculated, but it may depend on what can be done cheaply on chain. My initial suggestion would be a hash function like base58(sha256(sha256(publicKey))) (Similar to bitcoin). Or base58(sha3(publicKey)) (similar to ethereum). Do you have any thoughts there?

We can also choose to create DIDs off chain and pass them as an input to the DID program constructor, but generating on-chain from a pubkey would be "neater".

h2. DID Creation

Here's my proposal for an initial creation API:

Anyone can create a DID for anyone else. This may have change later on for security reasons i.e. if you own the private key, you must have been the one to create the DID, but I think it is safe for now.

DID Creation has the following inputs:

```
new DID(owner: PublicKey, content: DIDDocument)
```

The DID method identifier should be created from the owner public key (see above).

Both inputs are optional. If the owner is missing, the owner is the signer of the TX (i.e. creating a DID for yourself)
The content can be missing. In that case a "sparse DID" will be created, which will basically look like this:

```
{
  "@context": [
    "https://w3id.org/did/v1.0",
    "https://w3id.org/solid/v1"
  ],
  "id": "did:solid:TODO",
  "publicKeys": [
    {
      "id": "did:solid:TODO#key1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:solid:TODO",
      "publicKeyBase58": "BeqWbk3sPvujQgBySrwUbinjtXc1oAfg3iD87ShtVrKb"
    }
  ],
  "authentication": [
    "did:solid:TODO#key1"
  ]
}
```
@context metadata and method identifier (TODO above) are temporary.

If the content property is not missing, it should be JSON that matches the DID spec. Again, I think validating this JSON on-chain is not necessary, but we should probably either
a) check that the "owner" key is present in the "authentication" section
or
b) merge the owner key (i.e. the above sparse DID) with the content property.

@solana Which would you say is easier to implement?
