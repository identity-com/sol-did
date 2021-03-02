import { register } from './Registrar';
import { ResponseContent } from '../utils/writer';
import { DIDDocument } from 'did-resolver';
import { resolve } from './Resolver';

type ResolutionResult = {
  didDocument: DIDDocument;
  didResolutionMetadata: object;
  didDocumentMetadata: object;
};

export type DeactivateRequest = { identifier: string };
export type UpdateRequest = {
  identifier: string;
  jobId?: string;
  options?: Record<string, any>;
  secret?: Record<string, any>;
  didDocument: DIDDocument;
};
export type RegisterRequest = {
  jobId?: string;
  options?: Record<string, any>;
  secret?: Record<string, any>;
  didDocument: DIDDocument;
};

type CommonState = {
  jobId?: string;
  registrarMetadata?: Record<string, any>;
  methodMetadata?: Record<string, any>;
};
type DeactivateState = CommonState & { didState: { state: string } };
type UpdateState = CommonState & {
  didState: { state: string; secret?: Record<string, any> };
};
type RegisterState = CommonState & {
  didState: { state: string; identifier: string };
};

/**
 * Deactivates a DID.
 *
 * body DeactivateRequest  (optional)
 * returns DeactivateState
 **/
export const deactivateDID = async (
  _body: DeactivateRequest
): Promise<ResponseContent<DeactivateState>> => new ResponseContent(501);

/**
 * Updates a DID.
 *
 * body UpdateRequest  (optional)
 * returns UpdateState
 **/
export const updateDID = async (
  _body: UpdateRequest
): Promise<ResponseContent<UpdateState>> => new ResponseContent(501);

/**
 * Registers a DID.
 *
 * body RegisterRequest  (optional)
 * returns RegisterState
 **/
export const registerDID = async (
  body: RegisterRequest
): Promise<ResponseContent<RegisterState>> => {
  const fullDocument: DIDDocument = {
    ...body.didDocument,
  };
  const result = await register(fullDocument);

  const state = {
    didState: {
      state: 'finished',
      identifier: result.id,
    },
  };

  return new ResponseContent(200, state);
};

/**
 * Resolve a DID or other identifier.
 *
 * identifier String A DID or other identifier to be resolved.
 * accept String The requested MIME type of the DID document or DID resolution result. (optional)
 * returns Object
 **/
export const resolveDID = async (
  identifier: string,
  _accept: string
): Promise<ResponseContent<ResolutionResult>> => {
  const didDocument = await resolve(identifier);

  if (didDocument) {
    const result: ResolutionResult = {
      didDocument,
      didResolutionMetadata: {},
      didDocumentMetadata: {},
    };
    return new ResponseContent(200, result);
  }

  return new ResponseContent(404);
};
