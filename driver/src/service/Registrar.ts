import * as DID from '@identity.com/solid-did-client';
import { RegisterRequest, RegisterState } from './DefaultService';

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
    cluster: request.options?.cluster || 'mainnet-beta',
    document: request.didDocument,
    payer,
    owner: ownerPublicKey,
  });

  const document = await DID.resolve(identifier);
  console.log(document);

  return {
    didState: {
      state: 'finished',
      identifier: identifier,
      secret: {
        keys: [
          {
            ...document.publicKey[0],
            privateKeyBase58: ownerPrivateKey,
          },
        ],
      },
    },
  };
};
