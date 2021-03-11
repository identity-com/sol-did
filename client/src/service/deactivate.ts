import { DeactivateRequest, makeAccount } from '../lib/util';
import { SolidTransaction } from '../lib/solana/transaction';
import { Connection } from '@solana/web3.js';
import { ClusterType, DistributedId } from '../lib/solana/solid-data';

/**
 * Deactivates a SOLID DID on Solana.
 * @param request
 */
export const deactivate = async (request: DeactivateRequest): Promise<void> => {
  const id = DistributedId.parse(request.identifier);
  const payer = makeAccount(request.payer);
  const cluster = request.cluster || ClusterType.mainnetBeta();
  const connection = new Connection(cluster.solanaUrl(), 'recent');
  await SolidTransaction.deactivateSolid(
    connection,
    payer,
    id.pubkey.toPublicKey()
  );
};
