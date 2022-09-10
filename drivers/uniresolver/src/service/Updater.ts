import { UpdateRequest, UpdateState } from './DefaultService';
import {
  DidSolDocument,
  makeKeypair,
} from '@identity.com/sol-did-client';
import { buildService } from "../utils";

export const update = async (request: UpdateRequest): Promise<UpdateState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  const payerKeypair = makeKeypair(payer);
  const ownerKeypair = request.secret?.owner
    ? makeKeypair(request.secret.owner)
    : payerKeypair;

  const service = await buildService(request.identifier);

  const doc = await DidSolDocument.fromDoc(request.didDocument);
  await service
    .updateFromDoc(doc)
    .withAutomaticAlloc(payerKeypair.publicKey)
    .withPartialSigners(payerKeypair, ownerKeypair)
    .rpc();

  return {
    didState: {
      state: 'finished',
    },
  };
};
