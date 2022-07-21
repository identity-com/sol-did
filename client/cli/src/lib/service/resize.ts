import { makeKeypair, ResizeRequest } from '../util';
import { SolTransaction } from '../solana/transaction';
import { Connection } from '@solana/web3.js';
import {
  ClusterType,
  DecentralizedIdentifier,
  SolData,
} from '../solana/sol-data';
import { DEFAULT_DOCUMENT_SIZE, SOLANA_COMMITMENT } from '../constants';

/**
 * Resize a SOL DID Account on Solana.
 * @param request
 */
export const resize = async (request: ResizeRequest): Promise<string> => {
  const id = DecentralizedIdentifier.parse(request.did);

  const payer = makeKeypair(request.payer);
  const owner = request.owner ? makeKeypair(request.owner) : undefined;
  const cluster = request.cluster || ClusterType.mainnetBeta();
  const size = request.size || DEFAULT_DOCUMENT_SIZE;
  const connection =
    request.connection ||
    new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  await SolTransaction.resizeAccount(
    connection,
    payer,
    await id.pdaSolanaPubkey(),
    size,
    await SolData.parse(request.document),
    owner
  );

  return id.toString();
};
