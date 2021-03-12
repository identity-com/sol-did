import { DeactivateRequest, makeAccount } from '../lib/util';
import { SolidTransaction } from '../lib/solana/transaction';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/solid-data';
import { SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Deactivates a SOLID DID on Solana.
 * @param request
 */
export const deactivate = async (request: DeactivateRequest): Promise<void> => {
  const id = DecentralizedIdentifier.parse(request.identifier);
  const payer = makeAccount(request.payer);
  const owner = request.owner ? makeAccount(request.owner) : undefined;
  const cluster = id.clusterType;
  const connection = new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  await SolidTransaction.deactivateSolid(
    connection,
    payer,
    id.pubkey.toPublicKey(),
    owner
  );
};
