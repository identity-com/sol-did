import {
  createRegisterOrUpdateInstruction,
  makeKeypair,
  RemoveServiceInstructionRequest,
  RemoveServiceRequest,
  sendTransaction,
} from '../lib/util';
import { resolve } from './resolve';
import { pick, without } from 'ramda';
import { hasAlias, sanitizeDefaultKeys } from '../lib/did';
import { DIDDocument, ServiceEndpoint } from 'did-resolver';
import { Connection } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';

const findServiceWithAlias = (
  document: DIDDocument,
  alias: string
): ServiceEndpoint | undefined => document.service?.find(hasAlias(alias));

/**
 * Removes a service from a DID
 */
export const removeService = async (
  request: RemoveServiceRequest
): Promise<void> => {
  const { did, connection: connectionInput, alias } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createRemoveServiceInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    connection,
    did: did,
    alias,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createRemoveServiceInstruction = async (
  request: RemoveServiceInstructionRequest
) => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    size,
    alias,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const existingDocument = await resolve(did, { connection });
  const serviceToRemove = findServiceWithAlias(existingDocument, alias);

  if (!serviceToRemove)
    throw new Error(`Service ${alias} not found on ${did}`);

  // get the new list of services without the one being removed.
  // the cast is safe here as if the service array did not exist, it would fail above
  const newServices = without(
    [serviceToRemove],
    existingDocument.service as ServiceEndpoint[]
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
        'controller',
      ],
      existingDocument
    ),
    // remove the service property if empty. note this works only with mergeBehaviour "Overwrite"
    service: newServices.length ? newServices : undefined,
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
