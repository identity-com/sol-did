import { DIDDocument } from 'did-resolver';
import {
  calculateIdentifier,
  getPublicKey,
  matches,
  RegisterRequest,
} from './util';

/**
 * Resolves a SOLID DID to a document,
 * @param identifier The DID e.g. did:solid:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * or did:solid:devnet:FcFhBFRf6smQ48p7jFcE35uNuE9ScuUu6R2rdFtWjWhP
 * @throws Error if the document is not found, or if the
 */
export const resolve = (identifier: string): Promise<DIDDocument> => {
  // TODO
  return Promise.resolve({
    '@context': 'https://w3id.org/did/v1',
    id: identifier,
    publicKey: [],
  });
};

/**
 * Registers a SOLID DID on Solana.
 * @param request
 */
export const register = async (request: RegisterRequest): Promise<string> => {
  const owner = request.owner || getPublicKey(request.payer);
  const identifier = await calculateIdentifier(owner);

  const document: DIDDocument = {
    '@context': 'https://w3id.org/did/v1',
    publicKey: [],
    ...(request.document || {}),
    id: identifier,
  };

  if (!document.publicKey.find(matches(owner))) {
    // TODO ensure the owner key is referenced in the capabilityInvocation verification method
    throw new Error('The owner key must be included in the DID Document');
  }

  // Call Solana

  return Promise.resolve('did:solid:todo');
};
