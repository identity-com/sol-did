import {
  AddServiceInstructionRequest,
  AddServiceRequest,
  createRegisterOrUpdateInstruction,
  makeKeypair,
  sendTransaction,
} from '../lib/util';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { DIDDocument } from 'did-resolver';

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
) => {
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
