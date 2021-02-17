import { resolve } from './Resolver';
import { ResponseContent } from '../utils/writer';

/**
 * Resolve a DID or other identifier.
 *
 * identifier String A DID or other identifier to be resolved.
 * accept String The requested MIME type of the DID document or DID resolution result. (optional)
 * returns Object
 **/
export const resolveDID = async (identifier: string, _accept: string) => {
  const document = await resolve(identifier);

  if (document) return new ResponseContent(200, document);

  return new ResponseContent(404);
};
