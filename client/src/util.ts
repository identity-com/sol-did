import { DIDDocument, PublicKey } from 'did-resolver';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';

// a 64-byte private key on the X25519 curve.
// In string form it is base58-encoded
export type PrivateKey = number[] | string | Buffer;
export type PublicKeyBase58 = string;

export type RegisterRequest = {
  payer: PrivateKey;
  document?: Partial<DIDDocument>;
  owner?: PublicKeyBase58;
};

export const getPublicKey = (_privateKey: PrivateKey): PublicKeyBase58 => {
  return 'TODO'; // TODO
};

// calculate the DID identifier from the owner key (by generating a program address
export const calculateIdentifier = async (
  _owner: PublicKeyBase58
): Promise<string> => {
  return 'did:solid:todo'; // TODO
};

export const matches = (owner: PublicKeyBase58) => (key: PublicKey) =>
  key.publicKeyBase58 === owner;

const DID_REGEX = /^did:solid:(.+)$/;

export const extractMethodIdentifierFromDID = (did: string): string => {
  const matches = DID_REGEX.exec(did);

  if (!matches) throw new Error('Invalid DID');

  return matches[1];
};

export const identifierToPubkey = (did: string) => {
  const identifier = extractMethodIdentifierFromDID(did);

  return new SolanaPublicKey(identifier);
};
