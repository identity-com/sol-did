import {
  accountAndClusterToDID,
  getPublicKey,
  makeAccount,
  RegisterRequest,
  solanaUrlForCluster,
  stringToPublicKey,
} from '../util';
import { SolidTransaction } from '../transaction';
import { Connection } from '@solana/web3.js';
import { ExtendedCluster } from '../constants';

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
  const solidAccount = await SolidTransaction.createSolid(
    connection,
    payer,
    owner
  );
  return accountAndClusterToDID(solidAccount, cluster);
};
