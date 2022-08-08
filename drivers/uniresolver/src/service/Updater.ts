import { UpdateRequest, UpdateState } from './DefaultService';
import {
  CustomClusterUrlConfig,
  DidSolDocument,
  DidSolIdentifier,
  DidSolService,
  makeKeypair,
} from '@identity.com/sol-did-client';
import { getConfig } from '../config/config';

export const update = async (request: UpdateRequest): Promise<UpdateState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  const payerKeypair = makeKeypair(payer);
  const ownerKeypair = request.secret?.owner
    ? makeKeypair(request.secret.owner)
    : payerKeypair;

  const didSolIdentifier = DidSolIdentifier.parse(request.identifier);

  const config = await getConfig();
  let clusterConfig: CustomClusterUrlConfig | undefined;
  if (config) {
    clusterConfig = config.solanaRpcNodes;
  }

  const service = await DidSolService.build(didSolIdentifier, clusterConfig);
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
