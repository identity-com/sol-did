import {
  AddControllerInstructionRequest,
  AddControllerRequest,
  createRegisterOrUpdateInstruction,
  makeKeypair,
  sendTransaction,
} from '../lib/util';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { DIDDocument } from 'did-resolver';

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
) => {
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
