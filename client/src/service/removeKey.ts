import {
  createRegisterOrUpdateInstruction,
  makeKeypair,
  RemoveKeyInstructionRequest,
  RemoveKeyRequest,
  sendTransaction,
} from '../lib/util';
import { Connection, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { DIDDocument } from 'did-resolver';
import {
  findVerificationMethodWithAlias,
  isDefault,
  sanitizeDefaultKeys,
} from '../lib/did';
import { pick, without } from 'ramda';
import { resolve } from './resolve';

/**
 * Removes a key from the DID
 */
export const removeKey = async (request: RemoveKeyRequest): Promise<void> => {
  const { did, connection: connectionInput, fragment } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createRemoveKeyInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    connection,
    did: did,
    fragment: fragment,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createRemoveKeyInstruction = async (
  request: RemoveKeyInstructionRequest
): Promise<TransactionInstruction> => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    size,
    fragment,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const existingDocument = await resolve(did, { connection });
  const verificationMethodToRemove = findVerificationMethodWithAlias(
    existingDocument,
    fragment
  );

  if (!verificationMethodToRemove)
    throw new Error(`Key ${fragment} not found on ${did}`);

  // to save space on-chain, do not register properties that were unchanged or not registered in the existing doc
  const document: Partial<DIDDocument> = {
    ...pick(['controller', 'service'], existingDocument),
    assertionMethod:
      existingDocument.assertionMethod &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.assertionMethod
      ),
    authentication:
      existingDocument.authentication &&
      without([verificationMethodToRemove.id], existingDocument.authentication),
    capabilityInvocation:
      existingDocument.capabilityInvocation &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.capabilityInvocation
      ),
    capabilityDelegation:
      existingDocument.capabilityDelegation &&
      without(
        [verificationMethodToRemove.id],
        existingDocument.capabilityDelegation
      ),
    keyAgreement:
      existingDocument.keyAgreement &&
      without([verificationMethodToRemove.id], existingDocument.keyAgreement),
    verificationMethod:
      existingDocument.verificationMethod &&
      without(
        [verificationMethodToRemove],
        existingDocument.verificationMethod
      ),
  };

  // filter default keys from capability invocation and verification method
  // if they are the only ones, as they are added by the client by default, and do not need
  // to be stored on chain
  if (
    document.verificationMethod?.length === 1 &&
    isDefault(document.verificationMethod[0])
  ) {
    delete document.verificationMethod;
  }
  if (
    document.capabilityInvocation?.length === 1 &&
    isDefault(document.capabilityInvocation[0])
  ) {
    delete document.capabilityInvocation;
  }

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
