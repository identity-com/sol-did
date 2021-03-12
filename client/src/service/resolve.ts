import { DIDDocument } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { SolidTransaction } from '../lib/solana/transaction';
import { DecentralizedIdentifier } from '../lib/solana/solid-data';
import { SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Resolves a SOLID DID to a document,
 * @param identifier The DID e.g. did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  const id = DecentralizedIdentifier.parse(identifier);
  const connection = new Connection(
    id.clusterType.solanaUrl(),
    SOLANA_COMMITMENT
  );
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
