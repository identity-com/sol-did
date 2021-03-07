import * as DID from '@identity.com/solid-did-client';
import {
  RegisterRequest,
  RegisterState,
  RegisterStateKey,
} from './DefaultService';
import { ClusterType } from '@identity.com/solid-did-client';

export const register = async (
  request: RegisterRequest
): Promise<RegisterState> => {
  const payer = request.secret?.payer || process.env.PAYER;
  if (!payer)
    throw new Error('Missing payer information- add a request secret');

  let ownerPublicKey = request.options?.owner;
  let ownerPrivateKey = undefined;
  if (!ownerPublicKey) {
    ({
      publicKey: ownerPublicKey,
      secretKey: ownerPrivateKey,
    } = DID.generateKeypair());
  }

  const identifier = await DID.register({
    cluster: ClusterType.parse(request.options?.cluster || 'mainnet-beta'),
    document: request.didDocument,
    payer,
    owner: ownerPublicKey,
  });

  const document = await DID.resolve(identifier);
  console.log(document);

  // DIDs are created with at least one verificationMethod
  const key: RegisterStateKey = document.verificationMethod?.length
    ? document.verificationMethod[0]
    : {};
  if (ownerPrivateKey) key.privateKeyBase58 = ownerPrivateKey;

  return {
    didState: {
      state: 'finished',
      identifier: identifier,
      secret: {
        keys: [key],
      },
    },
  };
};
