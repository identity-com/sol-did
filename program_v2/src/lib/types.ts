
export type Bytes = ArrayLike<number>;
export type EthSigner = {
  publicKey: string;
  signMessage: (message: Bytes | string) => Promise<string>;
};

export type VerificationMethod = {
  alias: string;
  keyData: Bytes;
  type: VerificationMethodType;
  flags: VerificationMethodFlags;
}

export type Service = {
  id: string;
  serviceType: string;
  serviceEndpoint: string;
}

export enum VerificationMethodFlags {
  None = 0,
  Authentication = 1 << 0,
  Assertion = 1 << 1,
  KeyAgreement = 1 << 2,
  CapabilityInvocation = 1 << 3,
  CapabilityDelegation = 1 << 4,
  DidDocHidden = 1 << 5,
  OwnershipProof = 1 << 6,
  All = Authentication | Assertion | KeyAgreement | CapabilityInvocation | CapabilityDelegation | DidDocHidden | OwnershipProof
}

export enum VerificationMethodType {
  // The main Ed25519Verification Method.
  // https://w3c-ccg.github.io/lds-ed25519-2018/
  Ed25519VerificationKey2018,
  // Verification Method for For 20-bytes Ethereum Keys
  EcdsaSecp256k1RecoveryMethod2020,
  // Verification Method for a full 32 bytes Secp256k1 Verification Key
  EcdsaSecp256k1VerificationKey2019,
}

