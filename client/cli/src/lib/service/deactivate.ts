import {
  DeactivateInstructionRequest,
  DeactivateRequest,
  makeKeypair,
} from '../util';
import { SolTransaction } from '../solana/transaction';
import { Connection, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../solana/sol-data';
import { SOLANA_COMMITMENT } from '../constants';

/**
 * Deactivates a SOL DID on Solana.
 * @param request
 */
export const deactivate = async (request: DeactivateRequest): Promise<void> => {
  const id = DecentralizedIdentifier.parse(request.did);
  const payer = makeKeypair(request.payer);
  const owner = request.owner ? makeKeypair(request.owner) : undefined;
  const cluster = id.clusterType;
  const connection =
    request.connection ||
    new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  await SolTransaction.deactivateSol(
    connection,
    payer,
    await id.pdaPubkey().then((key) => key.toPublicKey()),
    owner
  );
};

export const createDeactivateInstruction = async ({
  did,
  authority,
}: DeactivateInstructionRequest): Promise<TransactionInstruction> => {
  const id = DecentralizedIdentifier.parse(did);
  return SolTransaction.deactivateDIDInstruction(
    await id.pdaSolanaPubkey(),
    authority
  );
};
