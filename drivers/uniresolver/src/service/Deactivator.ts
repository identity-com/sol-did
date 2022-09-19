import { makeKeypair } from '@identity.com/sol-did-client';
import { DeactivateRequest, DeactivateState } from './DefaultService';
import { buildService } from '../utils';

export const deactivate = async (
  request: DeactivateRequest
): Promise<DeactivateState> => {
  const owner = request.secret.owner;
  const payer = request.secret.payer || owner || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  const service = await buildService(request.identifier);

  const payerKeypair = makeKeypair(payer);
  const authorityKeypair = owner ? makeKeypair(owner) : payerKeypair;

  await service
    .close(payerKeypair.publicKey, authorityKeypair.publicKey)
    .withPartialSigners(authorityKeypair)
    .rpc();

  return {
    didState: {
      state: 'finished',
    },
  };
};
