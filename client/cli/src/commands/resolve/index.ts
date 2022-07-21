import { DIDDocument } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { SolTransaction } from '../../lib/solana/transaction';
import { DecentralizedIdentifier, SolData } from '../../lib/solana/sol-data';
import { SOLANA_COMMITMENT } from '../../lib/constants';
import { SolDidOptions } from '../../lib/util';

/**
 * Resolves a SOL DID to a document,
 * @param identifier The DID e.g. did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa
 * or did:sol:devnet:6Na3uiqyRGZZQdd19RLCb6kJHR51reFdhXzAuc6Y8Yef
 * @throws Error if the document is not found
 */
export const resolve = async (
  identifier: string,
  options: SolDidOptions = {}
): Promise<DIDDocument> => {
  const id = DecentralizedIdentifier.parse(identifier);
  const connection =
    options.connection ||
    new Connection(id.clusterType.solanaUrl(), SOLANA_COMMITMENT);
  const solData = await SolTransaction.getSol(
    connection,
    id.clusterType,
    await id.pdaSolanaPubkey()
  );
  if (solData !== null) {
    return solData.toDIDDocument();
  } else {
    return SolData.sparse(
      await id.pdaSolanaPubkey(),
      id.authorityPubkey.toPublicKey(),
      id.clusterType
    ).toDIDDocument();
  }
};
