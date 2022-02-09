import { DIDDocument, VerificationMethod } from 'did-resolver';
import { complement, filter, has, isNil } from 'ramda';
import { didIsRegistered, PublicKeyBase58 } from './util';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { DEFAULT_DOCUMENT_SIZE } from './constants';
import { createRegisterInstruction } from '../service/register';
import { DecentralizedIdentifier } from './solana/sol-data';

export const makeVerificationMethod = (
  did: string,
  key: PublicKeyBase58,
  alias: string
): VerificationMethod => ({
  id: `${did}#${alias}`,
  publicKeyBase58: key,
  type: 'Ed25519VerificationKey2018',
  controller: did,
});

export type DIDComponent = { id: string };

const isDIDComponent = (
  component: DIDComponent | string
): component is DIDComponent => has('id', component);

export const hasAlias =
  (alias: string) =>
  (component: DIDComponent | string): boolean =>
    isDIDComponent(component)
      ? component.id.endsWith(`#${alias}`) // DIDComponent case ID must match #alias
      : component.endsWith(`#${alias}`); // string case - must match #alias

export const isDefault = hasAlias('default');

export const findVerificationMethodWithAlias = (
  document: Partial<DIDDocument>,
  alias: string
): VerificationMethod | undefined =>
  document.verificationMethod?.find(hasAlias(alias));

// filter the default key from capability invocation and verification method
// If it is the only one in the capabilityInvocation array, it is inferred by default by the program,
// and therefore does not need to be stored on chain.
// It never needs to be stored on chain in the verificationMethod array, as it is always inferred
export const sanitizeDefaultKeys = (document: Partial<DIDDocument>): void => {
  // if verificationMethod contains the default key, remove it (it is always added by default)
  if (
    document.verificationMethod &&
    findVerificationMethodWithAlias(document, 'default')
  ) {
    document.verificationMethod = filter(
      (x) => !isDefault(x),
      document.verificationMethod
    );

    // if this now means the verification method array is empty, remove the array
    if (document.verificationMethod.length === 0) {
      delete document.verificationMethod;
    }
  }

  if (
    document.capabilityInvocation?.length === 1 &&
    isDefault(document.capabilityInvocation[0])
  ) {
    delete document.capabilityInvocation;
  }
};

export const filterNotNil = <T>(entries: (T | null | undefined)[]): T[] =>
  entries.filter(complement(isNil)) as T[];

const registerInstruction = async (
  payer: PublicKey,
  authority: PublicKey,
  document?: Partial<DIDDocument>,
  size: number = DEFAULT_DOCUMENT_SIZE
) =>
  createRegisterInstruction({
    payer,
    authority,
    size,
    document,
  });

export const didToPublicKey = (did: string): PublicKey =>
  DecentralizedIdentifier.parse(did).authorityPubkey.toPublicKey();

export const registerInstructionIfNeeded = async (
  connection: Connection,
  did: string,
  payer: PublicKey,
  document?: Partial<DIDDocument>,
  size?: number
): Promise<TransactionInstruction | null> => {
  const isRegistered = await didIsRegistered(connection, did);

  if (isRegistered) return null;

  const [instruction] = await registerInstruction(
    payer,
    didToPublicKey(did),
    document,
    size
  );
  return instruction;
};
