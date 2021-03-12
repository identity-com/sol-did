import * as DID from '@identity.com/solid-did-client';
import { UpdateRequest, UpdateState } from './DefaultService';

export const update = async (request: UpdateRequest): Promise<UpdateState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  await DID.update({
    payer,
    identifier: request.identifier,
    document: request.didDocument,
    mergeBehaviour: request.options?.mergeBehaviour,
  });

  return {
    didState: {
      state: 'finished',
    },
  };
};
