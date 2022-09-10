import { BN, web3 } from '@project-serum/anchor';
import {
  ConfirmOptions,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { VerificationMethod as DidVerificationMethod } from 'did-resolver';
import { ExtendedCluster } from './connection';

export type PrivateKey = number[] | string | Buffer | Uint8Array;

export type Bytes = ArrayLike<number>;
export type EthSigner = {
  publicKey: string;
  signMessage: (message: Bytes | string) => Promise<string>;
};

export type DidDataAccount = {
  version: number;
  bump: number;
  nonce: BN;
  initialVerificationMethod: VerificationMethod;
  verificationMethods: VerificationMethod[];
  services: Service[];
  nativeControllers: web3.PublicKey[];
  otherControllers: string[];
};

export type VerificationMethod = {
  fragment: string;
  keyData: Bytes;
  methodType: VerificationMethodType;
  flags: VerificationMethodFlags;
};

export type Service = {
  fragment: string;
  serviceType: string;
  serviceEndpoint: string;
};

export type DidSolUpdateArgs = {
  verificationMethods: VerificationMethod[];
  services: Service[];
  controllerDIDs: string[];
};

export enum VerificationMethodFlags {
  None = 0,
  Authentication = 1 << 0,
  Assertion = 1 << 1,
  KeyAgreement = 1 << 2,
  CapabilityInvocation = 1 << 3,
  CapabilityDelegation = 1 << 4,
  DidDocHidden = 1 << 5,
  OwnershipProof = 1 << 6,
  All = Authentication |
    Assertion |
    KeyAgreement |
    CapabilityInvocation |
    CapabilityDelegation |
    DidDocHidden |
    OwnershipProof,
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

export type DecentralizedIdentifierConstructor = {
  clusterType: ExtendedCluster | undefined;
  authority: PublicKey;
  fragment?: string;
};

export type DidVerificationMethodComponents = {
  verificationMethod: DidVerificationMethod[];
  authentication: (string | DidVerificationMethod)[];
  assertionMethod: (string | DidVerificationMethod)[];
  keyAgreement: (string | DidVerificationMethod)[];
  capabilityInvocation: (string | DidVerificationMethod)[];
  capabilityDelegation: (string | DidVerificationMethod)[];
};

// TODO: Change back to Anchor import does not export the correct Wallet type.
// TODO: Create Ticket within Anchor (and post PR?)
export interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export type DidSolServiceOptions = {
  connection?: Connection;
  wallet?: Wallet;
  confirmOptions?: ConfirmOptions;
};
