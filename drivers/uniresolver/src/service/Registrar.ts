// @ts-nocheck
import { RegisterRequest, RegisterState } from './DefaultService';

export const register = async (
  _request: RegisterRequest
): Promise<RegisterState> => {
  throw new Error('Not Implemented for new sol-did-client version >=3.0.0');

  // const payer = request.secret?.payer || process.env.PAYER;
  // if (!payer)
  //   throw new Error('Missing payer information- add a request secret');
  //
  // let ownerPublicKey = request.options?.owner;
  // let ownerPrivateKey = undefined;
  // if (!ownerPublicKey) {
  //   ({
  //     publicKey: ownerPublicKey,
  //     secretKey: ownerPrivateKey,
  //   } = DID.generateKeypair());
  // }
  //
  // const identifier = await DID.register({
  //   cluster: ClusterType.parse(request.options?.cluster || 'mainnet-beta'),
  //   document: request.didDocument,
  //   payer,
  //   owner: ownerPublicKey,
  // });
  //
  // const document = await DID.resolve(identifier);
  //
  // // DIDs are created with at least one verificationMethod
  // const key: RegisterStateKey = document.verificationMethod?.length
  //   ? document.verificationMethod[0]
  //   : {};
  // if (ownerPrivateKey) key.privateKeyBase58 = ownerPrivateKey;
  //
  // return {
  //   didState: {
  //     state: 'finished',
  //     identifier: identifier,
  //     secret: {
  //       keys: [key],
  //     },
  //   },
  // };
};
