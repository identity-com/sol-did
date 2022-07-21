import {
  AddControllerInstructionRequest,
  AddControllerRequest,
  createRegisterOrUpdateInstruction,
  makeKeypair,
  sendTransaction,
} from '../util';
import { Connection, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../solana/sol-data';
import { DIDDocument } from 'did-resolver';

/**
 * Adds a controller to the DID
 *
 * It will send a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered)
 */
export const addController = async (
  request: AddControllerRequest
): Promise<void> => {
  const { did, connection: connectionInput, controller } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createAddControllerInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    connection,
    did,
    controller,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createAddControllerInstruction = async (
  request: AddControllerInstructionRequest
): Promise<TransactionInstruction> => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    size,
    controller,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const document: Partial<DIDDocument> = {
    controller: [controller],
  };

  return createRegisterOrUpdateInstruction(
    did,
    payer,
    authority,
    document,
    connection,
    'Append',
    size
  );
};
