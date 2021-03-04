import {
  getPublicKey,
  makeAccount,
  publicKeyAndClusterToDID,
  RegisterRequest,
  solanaUrlForCluster,
  stringToPublicKey,
} from '../util';
import { SolidTransaction } from '../transaction';
import { Connection } from '@solana/web3.js';
import { ExtendedCluster } from '../constants';
import { getClusterType } from '../solid-data';

/**
 * Registers a SOLID DID on Solana.
 * @param request
 */
export const register = async (request: RegisterRequest): Promise<string> => {
  const payer = makeAccount(request.payer);
  const owner = request.owner
    ? stringToPublicKey(request.owner)
    : getPublicKey(request.payer);
  const cluster: ExtendedCluster = request.cluster || 'mainnet-beta';
  const connection = new Connection(solanaUrlForCluster(cluster), 'recent');
  const solidKey = await SolidTransaction.createSolid(
    connection,
    payer,
    owner,
    getClusterType(cluster)
  );
  return publicKeyAndClusterToDID(solidKey, cluster);
};
