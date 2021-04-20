## SOL Onchain Program

The following is an overall design document for the on-chain SOL program.

### State

#### DID Fields

* @context: `Array<string>`
  - example `[ "https://w3id.org/did/v1.0", "https://w3id.org/sol/v1" ]`
* id: did uri string in the form "did:sol:account_pubkey"
  - example: `"did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa"`
* publicKey: `Array<VerificationMethod>`
* authentication: `Array<DID>`
* capabilityInvocation: `Array<DID>`
* keyAgreement: `Array<DID>`
* assertion: `Array<DID>`
* service: `Array<Service>`

#### VerificationMethod

* id: did uri string
  - example "did:example:123456789abcdefghi#key-1",
* type: string
  - example "Ed25519VerificationKey2018", 
* controller: did uri string 
  - example "did:example:123456789abcdefghi",
* publicKeyBase58: string
  - example "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV"

#### Service

* id: did uri string
* type: string
  - examples "AgentService" "MessagingService"
* serviceEndpoint: string
  - example: `"https://hub.civic.com/did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa/agent"`

### Instructions

#### Create

* Ensure document account is rent-exempt
* Anyone can create a document for someone else
* Owner specified (default to provided signer)
* Document specified (default to sparse document)

#### Update

* check all "publicKey" referenced "authentication" or "capabilityInvocation"
* pubkey type must be "Ed25519VerificationKey2018"
* If the tx signer is in the list, allow the update.

### Web Integration

#### Read DID document

* Use JSON RPC to load provided DID

#### Unisolver Integration

* TODO @civic

### Roadmap

#### V1

@solana: program to create / update DID and JS integration for fetching
@civic: Unisolver integration 

## Registry contracts

### Current eth contracts

All found on [smart-contracts](https://github.com/identity-com/smart-contracts/tree/master/contracts)

#### Escrow

Hold funds while identity verification is performed before sending

#### IDV

Validator registry -- only validators on the registry can perform actions on the
marketplace.  This can be done using program addresses?

#### Ontology

Items on sale by the IDVs

#### Pricing

IDVs set / delete prices for credentialed items, and includes getters for all
prices on the marketplace and validators.

#### Upgradeability

Proxy allowing for updates to contracts.

### Solana version

All done through one program?  Escrow program maybe not be needed since we can approve
funds on SPL tokens before, upgradeability not needed since we have the upgradable loader.

#### State

* Item
* IDV

#### Instructions

* operations on IDV registry, signed by someone?
* operations on Items, signed by IDV owner
* Buy / sell / verify operations on items, used by anyone
