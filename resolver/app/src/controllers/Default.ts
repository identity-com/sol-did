import { ServerResponse, ClientRequest } from 'http';

import * as utils from '../utils/writer';
import * as Default from '../service/DefaultService';

export const resolve = (
  _req: ClientRequest,
  res: ServerResponse,
  _next: () => void,
  identifier: string,
  accept: string
) => {
  Default.resolveDID(identifier, accept)
    .then(response => {
      utils.writeJson(res, response);
    })
    .catch(response => {
      utils.writeJson(res, response);
    });
};
