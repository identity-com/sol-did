// @ts-nocheck
import { UpdateRequest, UpdateState } from './DefaultService';

export const update = async (_request: UpdateRequest): Promise<UpdateState> => {
  throw new Error('Not Implemented for new sol-did-client version >=3.0.0');

  // const owner = request.secret.owner;
  // const payer = request.secret.payer || owner || process.env.PAYER;
  // if (!payer)
  //   throw new Error('Missing payer information- add a request secret');
  //
  // await DID.update({
  //   owner,
  //   payer,
  //   did: request.identifier,
  //   document: request.didDocument,
  //   mergeBehaviour: request.options?.mergeBehaviour,
  // });
  //
  // return {
  //   didState: {
  //     state: 'finished',
  //   },
  // };
};
