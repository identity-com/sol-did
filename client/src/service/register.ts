import { getPublicKey, makeAccount, RegisterRequest } from '../lib/util';
import { SolTransaction } from '../lib/solana/transaction';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ClusterType,
  DecentralizedIdentifier,
  SolData,
} from '../lib/solana/sol-data';
import { DEFAULT_DOCUMENT_SIZE, SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Registers a SOL DID on Solana.
 * @param request
 */
export const register = async (request: RegisterRequest): Promise<string> => {
  const payer = makeAccount(request.payer);
  const owner = request.owner
    ? new PublicKey(request.owner)
    : getPublicKey(request.payer);
  const cluster = request.cluster || ClusterType.mainnetBeta();
  const size = request.size || DEFAULT_DOCUMENT_SIZE;
  const connection = new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  const solKey = await SolTransaction.createSol(
    connection,
    payer,
    owner,
    size,
    SolData.parse(request.document)
  );

  return DecentralizedIdentifier.create(solKey, cluster).toString();
};
