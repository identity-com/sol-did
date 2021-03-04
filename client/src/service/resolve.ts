import { DIDDocument } from 'did-resolver';
import { ExtendedCluster } from '../constants';
import {
  identifierToCluster,
  identifierToPubkey,
  solanaUrlForCluster,
} from '../util';
import { Connection } from '@solana/web3.js';
import { SolidTransaction } from '../transaction';

/**
 * Resolves a SOLID DID to a document,
 * @param identifier The DID e.g. did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  const cluster: ExtendedCluster = identifierToCluster(identifier);
  const connection = new Connection(solanaUrlForCluster(cluster), 'recent');
  const solidData = await SolidTransaction.getSolid(
    connection,
    identifierToPubkey(identifier)
  );
  // TODO map solidData to DIDDocument
  return {
    '@context': 'https://w3id.org/did/v1',
    id: identifier,
    // @ts-ignore
    temp: solidData,
    publicKey: [],
  };
};
