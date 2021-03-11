import * as DID from '@identity.com/solid-did-client';
import { DeactivateRequest, DeactivateState } from './DefaultService';
import { ClusterType } from '@identity.com/solid-did-client';

export const deactivate = async (
  request: DeactivateRequest
): Promise<DeactivateState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  await DID.deactivate({
    cluster: ClusterType.parse(request.options?.cluster || 'mainnet-beta'),
    payer,
    identifier: request.identifier,
  });

  return {
    didState: {
      state: 'finished',
    },
  };
};
