import { DIDDocument, ServiceEndpoint } from 'did-resolver';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { ClusterType, DecentralizedIdentifier } from './solana/sol-data';
import { decode, encode } from 'bs58';
import { DEFAULT_DOCUMENT_SIZE, PROGRAM_ID } from './constants';
import { createRegisterInstruction } from '../service/register';
import { createUpdateInstruction } from '../service/update';
import { didToPublicKey } from './did';
import { SolanaUtil } from './solana/solana-util';

// a 64-byte private key on the X25519 curve.
// In string form it is base58-encoded
export type PrivateKey = number[] | string | Buffer | Uint8Array;
export type PublicKeyBase58 = string;

export type SolDidOptions = {
  connection?: Connection;
};

export type RegisterRequest = SolDidOptions & {
  payer: PrivateKey;
  document?: Partial<DIDDocument>;
  owner?: PublicKeyBase58;
  cluster?: ClusterType;
  size?: number;
};

export type RegisterInstructionRequest = SolDidOptions & {
  payer: PublicKey;
  authority: PublicKey;
  size?: number;
  document?: Partial<DIDDocument>;
};

export type DeactivateRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
};

export type DeactivateInstructionRequest = SolDidOptions & {
  did: string;
  authority: PublicKey;
};

export type UpdateRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey; // optional different authority (DID owner) to the payer
  document: Partial<DIDDocument>;
  mergeBehaviour?: MergeBehaviour;
  size?: number;
};

export type UpdateInstructionRequest = SolDidOptions & {
  did: string;
  authority: PublicKey;
  document: Partial<DIDDocument>;
  mergeBehaviour?: MergeBehaviour;
  size?: number;
};

export type AddKeyRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  key: PublicKeyBase58;
  fragment: string;
  size?: number;
};

export type AddKeyInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  key: PublicKey;
  fragment: string;
  size?: number;
};

export type RemoveKeyRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  fragment: string;
  size?: number;
};

export type RemoveKeyInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  fragment: string;
  size?: number;
};

export type AddControllerRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  controller: string;
  size?: number;
};

export type AddControllerInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  controller: string;
  size?: number;
};

export type RemoveControllerRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  controller: string;
  size?: number;
};

export type RemoveControllerInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  controller: string;
  size?: number;
};

export type AddServiceRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  service: ServiceEndpoint;
  size?: number;
};

export type AddServiceInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  service: ServiceEndpoint;
  size?: number;
};

export type RemoveServiceRequest = SolDidOptions & {
  did: string;
  payer: PrivateKey;
  owner?: PrivateKey;
  alias: string;
  size?: number;
};

export type RemoveServiceInstructionRequest = SolDidOptions & {
  did: string;
  payer: PublicKey;
  authority: PublicKey;
  alias: string;
  size?: number;
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

export const keypairAndClusterToDID = async (
  keypair: Keypair,
  cluster: ClusterType = ClusterType.mainnetBeta()
): Promise<string> =>
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
  return DecentralizedIdentifier.create(key, clusterType).toString();
};

export const didIsRegistered = async (
  connection: Connection,
  did: string
): Promise<boolean> => {
  const decentralizedIdentifier = DecentralizedIdentifier.parse(did);
  const pda = await decentralizedIdentifier.pdaSolanaPubkey();

  const account = await connection.getAccountInfo(pda);

  if (!account) return false;

  if (account.owner.equals(PROGRAM_ID)) return true;

  throw new Error(
    `Invalid DID ${did}, the derived account ${pda} is registered to another program`
  );
};

export const sendTransaction = (
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: Keypair,
  owner: Keypair
): Promise<string> => {
  const transaction = new Transaction().add(...instructions);

  const keys = [payer];

  instructions.forEach((instruction) => {
    instruction.keys.map((meta) => {
      if (meta.isSigner && meta.pubkey.equals(owner.publicKey)) {
        keys.push(owner);
      }
    });
  });

  // Send the instructions
  return SolanaUtil.sendAndConfirmTransaction(connection, transaction, ...keys);
};

export const createRegisterOrUpdateInstruction = async (
  did: string,
  payer: PublicKey,
  authority: PublicKey,
  document: Partial<DIDDocument>,
  connection: Connection,
  mergeBehaviour: MergeBehaviour,
  size = DEFAULT_DOCUMENT_SIZE
): Promise<TransactionInstruction> => {
  const isRegistered = await didIsRegistered(connection, did);

  if (!isRegistered) {
    if (!authority.equals(didToPublicKey(did))) {
      throw new Error('Authority must be did for creation');
    }

    const register = await createRegisterInstruction({
      payer,
      authority,
      document,
      size,
    });

    return register[0];
  }

  return createUpdateInstruction({
    authority,
    document,
    did: did,
    connection,
    mergeBehaviour,
  });
};
