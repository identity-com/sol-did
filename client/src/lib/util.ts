import { DIDDocument } from 'did-resolver';
import { Account, PublicKey } from '@solana/web3.js';
import { ClusterType, DecentralizedIdentifier } from './solana/sol-data';
import { decode, encode } from 'bs58';
import { getKeyFromAuthority } from './solana/instruction';

// a 64-byte private key on the X25519 curve.
// In string form it is base58-encoded
export type PrivateKey = number[] | string | Buffer | Uint8Array;
export type PublicKeyBase58 = string;

export type RegisterRequest = {
  payer: PrivateKey;
  document?: Partial<DIDDocument>;
  owner?: PublicKeyBase58;
  cluster?: ClusterType;
  size?: number;
};

export type DeactivateRequest = {
  identifier: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
};

export type UpdateRequest = {
  identifier: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
  document: Partial<DIDDocument>;
  mergeBehaviour?: MergeBehaviour;
};

export type MergeBehaviour = 'Overwrite' | 'Append';

export const privateKeyIsArray = (
  privateKey: PrivateKey
): privateKey is number[] => Array.isArray(privateKey);
export const privateKeyIsString = (
  privateKey: PrivateKey
): privateKey is string => typeof privateKey === 'string';
export const privateKeyIsBuffer = (
  privateKey: PrivateKey
): privateKey is Buffer => Buffer.isBuffer(privateKey);
export const privateKeyIsUint8Array = (
  privateKey: PrivateKey
): privateKey is Uint8Array => privateKey instanceof Uint8Array;

/**
 * Create a Solana account object from an x25519 private key
 * @param privateKey
 */
export const makeAccount = (privateKey: PrivateKey): Account => {
  if (
    privateKeyIsArray(privateKey) ||
    privateKeyIsBuffer(privateKey) ||
    privateKeyIsUint8Array(privateKey)
  )
    return new Account(privateKey);
  if (privateKeyIsString(privateKey)) {
    const privateKeyHex = decode(privateKey);
    return new Account(privateKeyHex);
  }

  throw new Error('Incompatible private key format');
};

/**
 * Given a private key on the x25519 curve, get its public key
 * @param privateKey
 */
export const getPublicKey = (privateKey: PrivateKey): PublicKey =>
  makeAccount(privateKey).publicKey;

export const accountAndClusterToDID = (
  account: Account,
  cluster: ClusterType = ClusterType.mainnetBeta()
) => DecentralizedIdentifier.create(account.publicKey, cluster).toString();

type EncodedKeyPair = {
  secretKey: string;
  publicKey: string;
};
export const generateKeypair = (): EncodedKeyPair => {
  const account = new Account();
  return {
    secretKey: encode(account.secretKey),
    publicKey: account.publicKey.toBase58(),
  };
};

export const keyToIdentifier = async (
  key: PublicKey,
  clusterType: ClusterType = ClusterType.mainnetBeta()
) => {
  const didKey = await getKeyFromAuthority(key);
  return DecentralizedIdentifier.create(didKey, clusterType).toString();
};
