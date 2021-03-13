import { getPublicKey, makeAccount, RegisterRequest } from '../lib/util';
import { SolidTransaction } from '../lib/solana/transaction';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ClusterType,
  DecentralizedIdentifier,
  SolidData,
} from '../lib/solana/solid-data';
import { DEFAULT_DOCUMENT_SIZE, SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Registers a SOLID DID on Solana.
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
  const solidKey = await SolidTransaction.createSolid(
    connection,
    payer,
    owner,
    cluster,
    size,
    SolidData.parse(request.document)
  );

  return DecentralizedIdentifier.create(solidKey, cluster).toString();
};
