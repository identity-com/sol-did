import {
  RegisterRequest,
  RegisterState,
  RegisterStateKey,
} from './DefaultService';
import {
  clusterFromString,
  DidSolDocument,
  DidSolIdentifier,
  makeKeypair,
} from '@identity.com/sol-did-client';
import { Keypair } from '@solana/web3.js';
import { encode } from 'bs58';
import { buildService } from '../utils';

export const register = async (
  request: RegisterRequest
): Promise<RegisterState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  const payerKeypair = makeKeypair(payer);
  const ownerKeypair = request.options?.owner
    ? makeKeypair(request.options.owner)
    : Keypair.generate();

  const cluster = clusterFromString(request.options?.cluster) || 'mainnet-beta';
  const didSolIdentifier = DidSolIdentifier.create(
    ownerKeypair.publicKey,
    cluster
  );

  const service = await buildService(didSolIdentifier.toString());

  const doc = await DidSolDocument.fromDoc(request.didDocument);
  await service
    .updateFromDoc(doc)
    .withAutomaticAlloc(payerKeypair.publicKey)
    .withPartialSigners(payerKeypair)
    .rpc();

  const document = await service.resolve();

  // DIDs will always have a default verificationMethod.
  const key: RegisterStateKey =
    document.verificationMethod?.find(
      vm => vm.publicKeyBase58 === ownerKeypair.publicKey.toBase58()
    ) || {};
  if (!request.options?.owner)
    key.privateKeyBase58 = encode(ownerKeypair.secretKey);

  return {
    didState: {
      state: 'finished',
      identifier: didSolIdentifier.toString(),
      secret: {
        keys: [key],
      },
    },
  };
};
