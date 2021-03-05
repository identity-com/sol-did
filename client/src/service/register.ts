import {
  getPublicKey,
  makeAccount,
  publicKeyAndClusterToDID,
  RegisterRequest,
  stringToPublicKey,
} from '../util';
import { SolidTransaction } from '../transaction';
import { Connection } from '@solana/web3.js';
import { ClusterType } from '../solid-data';

/**
 * Registers a SOLID DID on Solana.
 * @param request
 */
export const register = async (request: RegisterRequest): Promise<string> => {
  const payer = makeAccount(request.payer);
  const owner = request.owner
    ? stringToPublicKey(request.owner)
    : getPublicKey(request.payer);
  const cluster = request.cluster || ClusterType.mainnetBeta();
  const connection = new Connection(cluster.solanaUrl(), 'recent');
  const solidKey = await SolidTransaction.createSolid(
    connection,
    payer,
    owner,
    cluster
  );
  return publicKeyAndClusterToDID(solidKey, cluster);
};
