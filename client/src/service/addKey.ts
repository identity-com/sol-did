import {
  AddKeyInstructionRequest,
  AddKeyRequest,
  createRegisterOrUpdateInstruction,
  makeKeypair,
  sendTransaction,
} from '../lib/util';
import { resolve } from './resolve';
import { isDefault, makeVerificationMethod } from '../lib/did';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { DecentralizedIdentifier } from '../lib/solana/sol-data';
import { DIDDocument, VerificationMethod } from 'did-resolver';

export const updatedCapabilityInvocation = (
  existingDocument: DIDDocument,
  newVerificationMethod: VerificationMethod
): (string | VerificationMethod)[] => {
  if (!existingDocument || !existingDocument.capabilityInvocation) {
    return [newVerificationMethod.id];
  }

  if (existingDocument.capabilityInvocation.length === 1) {
    if (isDefault(existingDocument.capabilityInvocation[0])) {
      // this is added by default when capabilityInvocation is empty on chain
      // when adding a new one, include it to avoid overwriting
      return [
        ...existingDocument.capabilityInvocation,
        newVerificationMethod.id,
      ];
    }
  }

  // no need to add existing capabilityInvocations as we are using merge behaviour "append"
  return [newVerificationMethod.id];
};

/**
 * Adds a key to the DID
 *
 * It will send a register instruction (if the DID is not yet registered on chain)
 * or an update instruction (if it is already registered)
 */
export const addKey = async (request: AddKeyRequest): Promise<void> => {
  const { did, connection: connectionInput, key, fragment } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const payer = makeKeypair(request.payer);
  const owner = makeKeypair(request.owner || request.payer);

  const instruction = await createAddKeyInstruction({
    payer: payer.publicKey,
    authority: owner.publicKey,
    key: new PublicKey(key),
    fragment: fragment,
    connection,
    did,
  });

  await sendTransaction(connection, [instruction], payer, owner);
};

export const createAddKeyInstruction = async (
  request: AddKeyInstructionRequest
): Promise<TransactionInstruction> => {
  const {
    payer,
    authority,
    did,
    connection: connectionInput,
    key,
    fragment,
    size,
  } = request;

  const id = DecentralizedIdentifier.parse(did);
  const cluster = id.clusterType;
  const connection =
    connectionInput || new Connection(cluster.solanaUrl(), 'recent');

  const existingDocument = await resolve(did, {
    connection,
  });

  const verificationMethod = makeVerificationMethod(
    did,
    key.toBase58(),
    fragment
  );

  const document = {
    verificationMethod: [verificationMethod],
    capabilityInvocation: updatedCapabilityInvocation(
      existingDocument,
      verificationMethod
    ),
  };

  return createRegisterOrUpdateInstruction(
    did,
    payer,
    authority,
    document,
    connection,
    'Append',
    size
  );
};
