import { DIDDocument } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { SolidTransaction } from '../lib/solana/transaction';
import { DistributedId } from '../lib/solana/solid-data';

/**
 * Resolves a SOLID DID to a document,
 * @param identifier The DID e.g. did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  const id = DistributedId.parse(identifier);
  const connection = new Connection(id.clusterType.solanaUrl(), 'recent');
  const solidData = await SolidTransaction.getSolid(
    connection,
    id.pubkey.toPublicKey()
  );
  if (solidData !== null) {
    return solidData.toDID();
  } else {
    throw new Error(`No DID found at identifier ${identifier}`);
  }
};
