import { DIDDocument, PublicKey } from 'did-resolver';
import { Account, PublicKey as SolanaPublicKey } from '@solana/web3.js';
import { DID_METHOD } from './constants';
import { ClusterType } from './solid-data';

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

// calculate the DID identifier from the owner key (by generating a program address)
export const calculateIdentifier = async (
  _owner: PublicKeyBase58
): Promise<string> => {
  return 'did:solid:todo'; // TODO
};

export const matches = (owner: PublicKeyBase58) => (key: PublicKey) =>
  key.publicKeyBase58 === owner;

const DID_REGEX = new RegExp('^did:' + DID_METHOD + ':?(.*):(.+)$');

const matchDID = (did: string): RegExpExecArray => {
  const matches = DID_REGEX.exec(did);

  if (!matches) throw new Error('Invalid DID');
  return matches;
};

export const extractMethodIdentifierFromDID = (did: string): string =>
  matchDID(did)[2];

export const identifierToPubkey = (did: string): SolanaPublicKey => {
  const identifier = extractMethodIdentifierFromDID(did);

  return new SolanaPublicKey(identifier);
};

export const identifierToCluster = (did: string): ClusterType => {
  const clusterString = matchDID(did)[1];
  return ClusterType.parse(clusterString);
};

export const accountAndClusterToDID = (
  account: Account,
  cluster: ClusterType = ClusterType.mainnetBeta()
) => {
  // no prefix for mainnet
  const identifierPrefix = cluster.mainnetBeta ? '' : cluster.toString() + ':';
  const identifier = account.publicKey.toBase58();
  return `did:${DID_METHOD}:${identifierPrefix}${identifier}`;
};
