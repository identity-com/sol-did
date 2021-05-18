import { DIDDocument } from 'did-resolver';
import { Keypair, PublicKey } from '@solana/web3.js';
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

export type RegisterInstructionRequest = {
  payer: PublicKey;
  authority: PublicKey;
  size?: number;
  document?: Partial<DIDDocument>;
};

export type DeactivateRequest = {
  identifier: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
};

export type DeactivateInstructionRequest = {
  identifier: string;
  authority: PublicKey;
};

export type UpdateRequest = {
  identifier: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
  document: Partial<DIDDocument>;
  mergeBehaviour?: MergeBehaviour;
};

export type UpdateInstructionRequest = {
  identifier: string;
  authority: PublicKey;
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
export const makeKeypair = (privateKey: PrivateKey): Keypair => {
  if (privateKeyIsArray(privateKey)) {
    return Keypair.fromSecretKey(Buffer.from(privateKey));
  }
  if (privateKeyIsBuffer(privateKey) || privateKeyIsUint8Array(privateKey))
    return Keypair.fromSecretKey(privateKey);
  if (privateKeyIsString(privateKey)) {
    const privateKeyHex = decode(privateKey);
    return Keypair.fromSecretKey(privateKeyHex);
  }

  throw new Error('Incompatible private key format');
};

/**
 * Given a private key on the x25519 curve, get its public key
 * @param privateKey
 */
export const getPublicKey = (privateKey: PrivateKey): PublicKey =>
  makeKeypair(privateKey).publicKey;

export const keypairAndClusterToDID = (
  keypair: Keypair,
  cluster: ClusterType = ClusterType.mainnetBeta()
): string =>
  DecentralizedIdentifier.create(keypair.publicKey, cluster).toString();

type EncodedKeyPair = {
  secretKey: string;
  publicKey: string;
};
export const generateKeypair = (): EncodedKeyPair => {
  const account = Keypair.generate();
  return {
    secretKey: encode(account.secretKey),
    publicKey: account.publicKey.toBase58(),
  };
};

export const keyToIdentifier = async (
  key: PublicKey,
  clusterType: ClusterType = ClusterType.mainnetBeta()
): Promise<string> => {
  console.log('KEY ', key);
  const didKey = await getKeyFromAuthority(key);
  return DecentralizedIdentifier.create(didKey, clusterType).toString();
};
