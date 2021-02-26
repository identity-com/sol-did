import { PublicKey } from '@solana/web3.js';
import { Assignable, SCHEMA } from './solana-borsh';
import { encode } from 'bs58';

export class SolidData extends Assignable {
  context: string[];
  did: string;
  publicKey: VerificationMethod[];
  authentication: string[];
  capabilityInvocation: string[];
  keyAgreement: string[];
  assertion: string[];

  static size(): number {
    return 1000;
  }

  static defaultContext(): string[] {
    return ["https://w3id.org/did/v1.0", "https://w3id.org/solid/v1"];
  }

  static newSparse(account: PublicKey, authority: PublicKey): SolidData {
    const context = SolidData.defaultContext();
    const accountBase58 = account.toString();
    const did = `did:solid:${accountBase58}`;
    const publicKey = VerificationMethod.newPublicKey(did, authority);
    const authentication = [publicKey.id];
    const capabilityInvocation = [publicKey.id];
    const keyAgreement = [publicKey.id];
    const assertion = [publicKey.id];
    return new SolidData({context, did, publicKey: [publicKey], authentication, capabilityInvocation, keyAgreement, assertion});
  }
}

export class VerificationMethod extends Assignable {
  id: string;
  verificationType: string;
  controller: string;
  pubkey: SolidPublicKey;

  static defaultVerificationType(): string {
    return "Ed25519VerificationKey2018";
  }

  static newPublicKey(controller: string, authority: PublicKey): VerificationMethod {
    const id = `${controller}#key1`;
    const verificationType = VerificationMethod.defaultVerificationType();
    const pubkey = SolidPublicKey.fromPublicKey(authority);
    return new VerificationMethod({id, verificationType, controller, pubkey});
  }
}

export class SolidPublicKey extends Assignable {
  // The public key bytes
  bytes: number[];

  toPublicKey(): PublicKey {
    return new PublicKey(this.bytes);
  }

  toString(): string {
    return encode(this.bytes);
  }

  static fromPublicKey(publicKey: PublicKey): SolidPublicKey {
    return new SolidPublicKey({bytes: Uint8Array.from(publicKey.toBuffer())});
  }
}

SCHEMA.set(SolidData, {
  kind: 'struct',
  fields: [
    ['context', ['string']],
    ['did', 'string'],
    ['publicKey', [VerificationMethod]],
    ['authentication', ['string']],
    ['capabilityInvocation', ['string']],
    ['keyAgreement', ['string']],
    ['assertion', ['string']]
  ]
});
SCHEMA.set(VerificationMethod, {
  kind: 'struct',
  fields: [['id', 'string'], ['verificationType', 'string'], ['controller', 'string'], ['pubkey', SolidPublicKey]],
});
SCHEMA.set(SolidPublicKey, {
  kind: 'struct',
  fields: [['bytes', [32]]]
});
