import {
  makeKeypair,
  UpdateInstructionRequest,
  UpdateRequest,
} from '../util';
import { SolTransaction } from '../solana/transaction';
import { Connection, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier, SolData } from '../solana/sol-data';

/**
 * Updates a SOL DID on Solana.
 * @param request
 */
export const update = async (request: UpdateRequest): Promise<void> => {
  const id = DecentralizedIdentifier.parse(request.did);
  const payer = makeKeypair(request.payer);
  const owner = request.owner ? makeKeypair(request.owner) : undefined;
  const cluster = id.clusterType;
  const connection =
    request.connection || new Connection(cluster.solanaUrl(), 'recent');
  await SolTransaction.updateDID(
    connection,
    cluster,
    payer,
    await id.pdaSolanaPubkey(),
    await SolData.parse(request.document),
    request.mergeBehaviour || 'Append',
    owner
  );
};

export const createUpdateInstruction = async ({
  did,
  authority,
  document,
  mergeBehaviour,
  connection: connectionInput,
}: UpdateInstructionRequest): Promise<TransactionInstruction> => {
  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');
  return SolTransaction.updateDIDInstruction(
    connection,
    cluster,
    await id.pdaSolanaPubkey(),
    authority,
    await SolData.parse(document),
    mergeBehaviour || 'Append'
  );
};
