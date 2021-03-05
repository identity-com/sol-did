import { register } from './Registrar';
import { ResponseContent } from '../utils/writer';
import { DIDDocument, PublicKey } from 'did-resolver';
import * as DID from '@identity.com/solid-did-client';

type ResolutionResult = {
  didDocument: DIDDocument;
  didResolutionMetadata: object;
  didDocumentMetadata: object;
};

export type RegisterOptions = {
  cluster?: string;
  owner?: string;
};
export type RegisterSecrets = {
  payer: string;
};
export type DeactivateRequest = {
  identifier: string;
  secret?: RegisterSecrets;
};
export type UpdateRequest = {
  identifier: string;
  jobId?: string;
  options?: RegisterOptions;
  secret?: RegisterSecrets;
  didDocument: DIDDocument;
};
export type RegisterRequest = {
  jobId?: string;
  options?: RegisterOptions;
  secret?: RegisterSecrets;
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

type RegisterStateKey = PublicKey | { privateKeyBase58: string };
type RegisterStateSecret = {
  keys: RegisterStateKey[];
};
export type RegisterState = CommonState & {
  didState: { state: string; identifier: string; secret: RegisterStateSecret };
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
  const state = await register(body);

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
  const didDocument = await DID.resolve(identifier);

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
