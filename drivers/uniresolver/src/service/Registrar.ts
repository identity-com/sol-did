import { RegisterRequest, RegisterState, RegisterStateKey } from './DefaultService';
import {
  // clusterFromString,
  DidSolIdentifier,
  DidSolService,
  makeKeypair
} from "@identity.com/sol-did-client";
import { Keypair } from '@solana/web3.js';
import { encode } from 'bs58';

export const register = async (
  request: RegisterRequest
): Promise<RegisterState> => {

  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  const payerKeypair = makeKeypair(payer);
  const ownerKeypair = request.options?.owner ? makeKeypair(request.options.owner) : Keypair.generate();

  // TODO
  const cluster = 'mainnet-beta';
  // const cluster = clusterFromString(request.options?.cluster) || 'mainnet-beta';
  const didSolIdentifier = DidSolIdentifier.create(
    ownerKeypair.publicKey,
    cluster
  );

  const service = await DidSolService.build(didSolIdentifier);
  await service.initialize().withPartialSigners(payerKeypair).rpc();

  // update state to request.didDocument TODO
  // await service.update(request.didDocument).withPartialSigners(payerKeypair).rpc();

  const document = await service.resolve();

  // DIDs will always have a default verificationMethod.
  const key: RegisterStateKey = document.verificationMethod?.find(vm => vm.publicKeyBase58 === ownerKeypair.publicKey.toBase58()) || {};
  if (!request.options?.owner) key.privateKeyBase58 = encode(ownerKeypair.secretKey);

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
