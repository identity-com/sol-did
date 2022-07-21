import {
  AddServiceInstructionRequest,
  AddServiceRequest,
  createRegisterOrUpdateInstruction,
  makeKeypair,
  sendTransaction,
} from '../util';
import { Connection, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../solana/sol-data';
import { DIDDocument } from 'did-resolver';

/**
 * Adds a service to the DID
 *
 * It will send a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered)
 */
export const addService = async (request: AddServiceRequest): Promise<void> => {
  const { did, connection: connectionInput, service } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createAddServiceInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    connection,
    did: did,
    service,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createAddServiceInstruction = async (
  request: AddServiceInstructionRequest
): Promise<TransactionInstruction> => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    size,
    service,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const document: Partial<DIDDocument> = {
    service: [service],
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
