import { PublicKey } from '@solana/web3.js';
import { Assignable, Enum, SCHEMA } from './solana-borsh';
import { encode } from 'bs58';

export class SolidData extends Assignable {
  context: string[];
  did: DistributedId;
  publicKey: VerificationMethod[];
  authentication: DistributedId[];
  capabilityInvocation: DistributedId[];
  keyAgreement: DistributedId[];
  assertion: DistributedId[];

  static size(): number {
    return 1000;
  }

  static defaultContext(): string[] {
    return ['https://w3id.org/did/v1.0', 'https://w3id.org/solid/v1'];
  }

  static sparse(
    account: PublicKey,
    authority: PublicKey,
    clusterType: ClusterType
  ): SolidData {
    const context = SolidData.defaultContext();
    const pubkey = SolidPublicKey.fromPublicKey(account);
    const did = new DistributedId({
      clusterType,
      pubkey,
      identifier: '',
    });
    const publicKey = VerificationMethod.newPublicKey(did, authority);
    const authentication = [publicKey.id];
    const capabilityInvocation = [publicKey.id];
    const keyAgreement = [publicKey.id];
    const assertion = [publicKey.id];
    return new SolidData({
      context,
      did,
      publicKey: [publicKey],
      authentication,
      capabilityInvocation,
      keyAgreement,
      assertion,
    });
  }
}

export class VerificationMethod extends Assignable {
  id: DistributedId;
  verificationType: string;
  controller: DistributedId;
  pubkey: SolidPublicKey;

  static defaultVerificationType(): string {
    return 'Ed25519VerificationKey2018';
  }

  static newPublicKey(
    controller: DistributedId,
    authority: PublicKey
  ): VerificationMethod {
    const id = controller.clone();
    id.identifier = 'key1';
    const verificationType = VerificationMethod.defaultVerificationType();
    const pubkey = SolidPublicKey.fromPublicKey(authority);
    return new VerificationMethod({ id, verificationType, controller, pubkey });
  }
}

export class DistributedId extends Assignable {
  clusterType: ClusterType;
  pubkey: SolidPublicKey;
  identifier: string;

  clone(): DistributedId {
    return new DistributedId({
      clusterType: this.clusterType,
      pubkey: this.pubkey,
      identifier: this.identifier,
    });
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
    return new SolidPublicKey({ bytes: Uint8Array.from(publicKey.toBuffer()) });
  }
}

export class ClusterType extends Enum {
  testnet: Testnet;
  mainnetBeta: MainnetBeta;
  devnet: Devnet;
  development: Development;

  static testnet(): ClusterType {
    return new ClusterType({ testnet: new Testnet({}) });
  }

  static mainnetBeta(): ClusterType {
    return new ClusterType({ mainnetBeta: new MainnetBeta({}) });
  }

  static devnet(): ClusterType {
    return new ClusterType({ devnet: new Devnet({}) });
  }

  static development(): ClusterType {
    return new ClusterType({ development: new Development({}) });
  }
}

export class Testnet extends Assignable {}
export class MainnetBeta extends Assignable {}
export class Devnet extends Assignable {}
export class Development extends Assignable {}

SCHEMA.set(SolidData, {
  kind: 'struct',
  fields: [
    ['context', ['string']],
    ['did', DistributedId],
    ['publicKey', [VerificationMethod]],
    ['authentication', [DistributedId]],
    ['capabilityInvocation', [DistributedId]],
    ['keyAgreement', [DistributedId]],
    ['assertion', [DistributedId]],
  ],
});
SCHEMA.set(VerificationMethod, {
  kind: 'struct',
  fields: [
    ['id', DistributedId],
    ['verificationType', 'string'],
    ['controller', DistributedId],
    ['pubkey', SolidPublicKey],
  ],
});
SCHEMA.set(DistributedId, {
  kind: 'struct',
  fields: [
    ['clusterType', ClusterType],
    ['pubkey', SolidPublicKey],
    ['identifier', 'string'],
  ],
});
SCHEMA.set(SolidPublicKey, {
  kind: 'struct',
  fields: [['bytes', [32]]],
});
SCHEMA.set(ClusterType, {
  kind: 'enum',
  field: 'enum',
  values: [
    ['testnet', Testnet],
    ['mainnetBeta', MainnetBeta],
    ['devnet', Devnet],
    ['development', Development],
  ],
});
SCHEMA.set(Testnet, { kind: 'struct', fields: [] });
SCHEMA.set(MainnetBeta, { kind: 'struct', fields: [] });
SCHEMA.set(Devnet, { kind: 'struct', fields: [] });
SCHEMA.set(Development, { kind: 'struct', fields: [] });
