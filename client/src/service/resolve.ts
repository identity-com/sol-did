import { DIDDocument } from 'did-resolver';
import { identifierToCluster, identifierToPubkey } from '../lib/util';
import { Connection } from '@solana/web3.js';
import { SolidTransaction } from '../lib/solana/transaction';

/**
 * Resolves a SOLID DID to a document,
 * @param identifier The DID e.g. did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  const cluster = identifierToCluster(identifier);
  const connection = new Connection(cluster.solanaUrl(), 'recent');
  const solidData = await SolidTransaction.getSolid(
    connection,
    identifierToPubkey(identifier)
  );
  if (solidData !== null) {
    return solidData.toDID();
  } else {
    throw new Error(`No DID found at identifier ${identifier}`);
  }
};
