import { makeAccount, UpdateRequest } from '../lib/util';
import { SolTransaction } from '../lib/solana/transaction';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier, SolData } from '../lib/solana/sol-data';

/**
 * Updates a SOL DID on Solana.
 * @param request
 */
export const update = async (request: UpdateRequest): Promise<void> => {
  const id = DecentralizedIdentifier.parse(request.identifier);
  const payer = makeAccount(request.payer);
  const owner = request.owner ? makeAccount(request.owner) : undefined;
  const cluster = id.clusterType;
  const connection = new Connection(cluster.solanaUrl(), 'recent');
  await SolTransaction.updateSol(
    connection,
    cluster,
    payer,
    id.pubkey.toPublicKey(),
    SolData.parse(request.document),
    request.mergeBehaviour || 'Append',
    owner
  );
};
