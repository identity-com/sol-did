import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { X25519KeyAgreementKey2019 } from '@digitalbazaar/x25519-key-agreement-key-2019';

import { PublicKeyBase58 } from '@identity.com/solid-did-client';
import { CryptoLD, LDKeyPair } from 'crypto-ld';
import { DIDDocument } from 'did-resolver';

const cryptoLd = new CryptoLD();
cryptoLd.use(X25519KeyAgreementKey2019);
cryptoLd.use(Ed25519VerificationKey2020);

export const publicKeyBase58ToCryptoLD = async (
  publicKey: PublicKeyBase58
): Promise<LDKeyPair> => {
  const edKey = await cryptoLd.from({
    type: Ed25519VerificationKey2020.suite,
    // the multibase key is the public key in base58 plus the multibase indicator for base58 ('z')
    publicKeyMultibase: 'z' + publicKey,
  });

  // due to (probable) versioning conflict between digitalbazaar libraries,
  // the edKey object requires a publicKeyBase58 field as well as a publicKeyMultibase field
  // in order to be converted into a did-key document by did-method-key
  edKey.publicKeyBase58 = publicKey;

  return edKey;
};

export const cryptoLDToPublicKeyBase58 = (key: LDKeyPair): PublicKeyBase58 =>
  // trim th first character of the public key in multibase form ('z') to produce th base58 key
  key
    .export({ publicKey: true })
    .publicKeyMultibase.substring(1) as PublicKeyBase58;

/**
 * did-method-key uses some deprecated keys in DIDDocument. This normalizes the fields to make them
 * match did-solid
 * @param document The unnormmalized document
 */
export const normalizeDidKeyDocument = (document: DIDDocument): DIDDocument => {
  const shallowClone = { ...document };
  if (!shallowClone.verificationMethod && shallowClone.publicKey) {
    shallowClone.verificationMethod = shallowClone.publicKey;
  }

  return shallowClone;
};
