import { DIDDocument } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { SolTransaction } from '../lib/solana/transaction';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Resolves a SOL DID to a document,
 * @param identifier The DID e.g. did:sol:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:sol:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  const id = DecentralizedIdentifier.parse(identifier);
  const connection = new Connection(
    id.clusterType.solanaUrl(),
    SOLANA_COMMITMENT
  );
  const solData = await SolTransaction.getSol(
    connection,
    id.clusterType,
    id.pubkey.toPublicKey()
  );
  if (solData !== null) {
    return solData.toDIDDocument();
  } else {
    throw new Error(`No DID found at identifier ${identifier}`);
  }
};
