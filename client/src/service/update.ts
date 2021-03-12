import { makeAccount, UpdateRequest } from '../lib/util';
import { SolidTransaction } from '../lib/solana/transaction';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier, SolidData } from '../lib/solana/solid-data';

/**
 * Updates a SOLID DID on Solana.
 * @param request
 */
export const update = async (request: UpdateRequest): Promise<void> => {
  const id = DecentralizedIdentifier.parse(request.identifier);
  const payer = makeAccount(request.payer);
  const owner = request.owner ? makeAccount(request.owner) : undefined;
  const cluster = id.clusterType;
  const connection = new Connection(cluster.solanaUrl(), 'recent');
  await SolidTransaction.updateSolid(
    connection,
    payer,
    id.pubkey.toPublicKey(),
    SolidData.parse(request.document),
    request.mergeBehaviour || 'Append',
    owner
  );
};
