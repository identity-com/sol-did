import {
  createRegisterOrUpdateInstruction,
  makeKeypair,
  RemoveControllerInstructionRequest,
  RemoveControllerRequest,
  sendTransaction,
} from '../lib/util';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { DIDDocument } from 'did-resolver';
import { filterNotNil, sanitizeDefaultKeys } from '../lib/did';
import { flatten, pick, without } from 'ramda';
import { resolve } from './resolve';

const hasController = (document: DIDDocument, controller: string): boolean => {
  if (!document.controller) return false;

  if (Array.isArray(document.controller)) {
    return document.controller.includes(controller);
  }

  return document.controller === controller;
};

/**
 * Removes controller to the DID
 */
export const removeController = async (
  request: RemoveControllerRequest
): Promise<void> => {
  const { did, connection: connectionInput, controller } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createRemoveControllerInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    connection,
    did: did,
    controller,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createRemoveControllerInstruction = async (
  request: RemoveControllerInstructionRequest
) => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    size,
    controller,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const existingDocument = await resolve(did, { connection });

  if (!hasController(existingDocument, controller))
    throw new Error(`Controller ${controller} not found on ${did}`);

  // remove the controller from the list
  const newControllers = without(
    [controller],
    filterNotNil(flatten([existingDocument.controller]))
  );

  const document: Partial<DIDDocument> = {
    ...pick(
      [
        'verificationMethod',
        'authentication',
        'assertionMethod',
        'keyAgreement',
        'capabilityInvocation',
        'capabilityDelegation',
        'service',
      ],
      existingDocument
    ),
    // remove the controller property if empty. note this works only with mergeBehaviour "Overwrite"
    controller: newControllers.length ? newControllers : undefined,
  };

  sanitizeDefaultKeys(document);

  return createRegisterOrUpdateInstruction(
    did,
    payer,
    authority,
    document,
    connection,
    'Overwrite',
    size
  );
};
