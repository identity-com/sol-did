import { ServerResponse, ClientRequest } from 'http';

import { ResponseContent, writeJson } from '../utils/writer';
import * as Default from '../service/DefaultService';

const write = (res: ServerResponse) => <S>(response: ResponseContent<S>) =>
  writeJson(res, response);

const writeError = (res: ServerResponse) => (error: Error) => {
  console.error(error);
  return writeJson(res, new ResponseContent(500, error.message));
}

const execute = <S>(
  fn: () => Promise<ResponseContent<S>>,
  res: ServerResponse
) =>
  fn()
    .then(write(res))
    .catch(writeError(res));

const executeRequest = <R, S>(fn: (body: R) => Promise<ResponseContent<S>>) => (
  _req: ClientRequest,
  res: ServerResponse,
  _next: () => void,
  body: R
) => execute(() => fn(body), res);

export const resolveDID = (
  _req: ClientRequest,
  res: ServerResponse,
  _next: () => void,
  identifier: string,
  accept: string
) => execute(() => Default.resolveDID(identifier, accept), res);
export const deactivateDID = executeRequest(Default.deactivateDID);
export const updateDID = executeRequest(Default.updateDID);
export const registerDID = executeRequest(Default.registerDID);
