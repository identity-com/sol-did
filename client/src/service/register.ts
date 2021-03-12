import { getPublicKey, makeAccount, RegisterRequest } from '../lib/util';
import { SolidTransaction } from '../lib/solana/transaction';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ClusterType,
  DistributedId,
  SolidData,
} from '../lib/solana/solid-data';
import { SOLANA_COMMITMENT } from '../lib/constants';

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
  const connection = new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  const solidKey = await SolidTransaction.createSolid(
    connection,
    payer,
    owner,
    cluster,
    SolidData.parse(request.document)
  );

  return DistributedId.create(solidKey, cluster).toString();
};
