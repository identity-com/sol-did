import { DIDDocument } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { SolTransaction } from '../lib/solana/transaction';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Resolves a SOL DID to a document,
 * @param identifier The DID e.g. did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa
 * or did:sol:devnet:6Na3uiqyRGZZQdd19RLCb6kJHR51reFdhXzAuc6Y8Yef
 * @throws Error if the document is not found
 */
export const resolve = async (identifier: string): Promise<DIDDocument> => {
  // TODO replace with Promise<DIDDocument | null> ?
  const id = await DecentralizedIdentifier.parse(identifier);
  const connection = new Connection(
    id.clusterType.solanaUrl(),
    SOLANA_COMMITMENT
  );
  const solData = await SolTransaction.getSol(
    connection,
    id.clusterType,
    id.pdaPubkey.toPublicKey()
  );
  if (solData !== null) {
    return solData.toDIDDocument();
  } else {
    throw new Error(`No DID found at identifier ${identifier}`);
  }
};
