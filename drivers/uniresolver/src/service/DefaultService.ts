import { register } from './Registrar';
import { ResponseContent } from '../utils/writer';
import { DIDDocument, VerificationMethod } from 'did-resolver';
import * as DID from '@identity.com/sol-did-client-legacy';
import { deactivate } from './Deactivator';
import { update } from './Updater';
import { CustomClusterUrlConfig, DidSolIdentifier, DidSolService } from "@identity.com/sol-did-client";
import { getConfig } from "../config/config";

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
  payer?: string;
};

export type DeactivateOptions = {};
export type DeactivateSecrets = RegisterSecrets & { owner?: string };
export type DeactivateRequest = {
  identifier: string;
  options?: DeactivateOptions;
  secret: DeactivateSecrets;
};

export type UpdateOptions = {
  mergeBehaviour?: DID.MergeBehaviour;
};
export type UpdateSecrets = RegisterSecrets & { owner?: string };
export type UpdateRequest = {
  identifier: string;
  jobId?: string;
  options?: UpdateOptions;
  secret: UpdateSecrets;
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
export type DeactivateState = CommonState & { didState: { state: string } };
export type UpdateState = CommonState & {
  didState: { state: string; secret?: Record<string, any> };
};

type RegisterStatePrivateKey = { privateKeyBase58?: string };
// a returned key may have a private key, if the owner was not passed as a parameter
// to the register call. In this case, a new key is generated and returned to the caller
export type RegisterStateKey =
  | (VerificationMethod & RegisterStatePrivateKey)
  | RegisterStatePrivateKey;
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
  body: DeactivateRequest
): Promise<ResponseContent<DeactivateState>> => {
  const state = await deactivate(body);

  return new ResponseContent(200, state);
};

/**
 * Updates a DID.
 *
 * body UpdateRequest  (optional)
 * returns UpdateState
 **/
export const updateDID = async (
  body: UpdateRequest
): Promise<ResponseContent<UpdateState>> => {
  const state = await update(body);

  return new ResponseContent(200, state);
};

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
  console.log(`Resolving ${identifier}`);

  const config = await getConfig();
  let clusterConfig: CustomClusterUrlConfig | undefined;
  if (config) {
    clusterConfig = config.solanaRpcNodes;
  }

  const didSolIdentifier = DidSolIdentifier.parse(identifier);
  const service = await DidSolService.build(didSolIdentifier, clusterConfig);
  const didDocument = await service.resolve();

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
