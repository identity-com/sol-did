import { clusterApiUrl, Cluster, PublicKey } from '@solana/web3.js';
import { Assignable, Enum, SCHEMA } from './solana-borsh';
import { DID_METHOD, DID_HEADER } from '../constants';
import { encode } from 'bs58';
import {
  DIDDocument,
  VerificationMethod as DIDVerificationMethod,
  ServiceEndpoint as DIDServiceEndpoint,
} from 'did-resolver';

export class SolidData extends Assignable {
  context: string[];
  did: DistributedId;
  verificationMethod: VerificationMethod[];
  authentication: DistributedId[];
  capabilityInvocation: DistributedId[];
  capabilityDelegation: DistributedId[];
  keyAgreement: DistributedId[];
  assertionMethod: DistributedId[];
  service: ServiceEndpoint[];

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
    const verificationMethod = VerificationMethod.newPublicKey(did, authority);
    const authentication = [verificationMethod.id];
    const capabilityInvocation = [verificationMethod.id];
    const capabilityDelegation = [];
    const keyAgreement = [];
    const assertionMethod = [];
    const service = [];
    return new SolidData({
      context,
      did,
      verificationMethod: [verificationMethod],
      authentication,
      capabilityInvocation,
      capabilityDelegation,
      keyAgreement,
      assertionMethod,
      service,
    });
  }

  static empty(): SolidData {
    return new SolidData({
      context: [],
      did: DistributedId.empty(),
      verificationMethod: [],
      authentication: [],
      capabilityInvocation: [],
      capabilityDelegation: [],
      keyAgreement: [],
      assertionMethod: [],
      service: [],
    });
  }

  toDID(): DIDDocument {
    return {
      '@context': this.context,
      id: this.did.toString(),
      verificationMethod: this.verificationMethod.map(v => v.toDID()),
      authentication: this.authentication.map(v => v.toString()),
      assertionMethod: this.assertionMethod.map(v => v.toString()),
      keyAgreement: this.keyAgreement.map(v => v.toString()),
      capabilityInvocation: this.capabilityInvocation.map(v => v.toString()),
      capabilityDelegation: this.capabilityDelegation.map(v => v.toString()),
      service: this.service.map(v => v.toDID()),
      // @ts-ignore
      publicKey: this.verificationMethod.map(v => v.toDID()),
    };
  }

  static parse(document: Partial<DIDDocument> | undefined): SolidData {
    if (document) {
      return new SolidData({
        context: document['@context'] || [],
        did: document.id
          ? DistributedId.parse(document.id)
          : DistributedId.empty(),
        verificationMethod: document.verificationMethod
          ? document.verificationMethod.map(v => VerificationMethod.parse(v))
          : [],
        authentication: DistributedId.parseMaybeArray(document.authentication),
        capabilityInvocation: DistributedId.parseMaybeArray(
          document.capabilityInvocation
        ),
        capabilityDelegation: DistributedId.parseMaybeArray(
          document.capabilityDelegation
        ),
        keyAgreement: DistributedId.parseMaybeArray(document.keyAgreement),
        assertionMethod: DistributedId.parseMaybeArray(
          document.assertionMethod
        ),
        service: document.service
          ? document.service.map(v => ServiceEndpoint.parse(v))
          : [],
      });
    } else {
      return SolidData.empty();
    }
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

  toDID(): DIDVerificationMethod {
    return {
      id: this.id.toString(),
      type: this.verificationType,
      controller: this.controller.toString(),
      publicKeyBase58: this.pubkey.toString(),
    };
  }

  static parse(
    didVerificationMethod: DIDVerificationMethod
  ): VerificationMethod {
    return new VerificationMethod({
      id: DistributedId.parse(didVerificationMethod.id),
      verificationType: didVerificationMethod.type,
      controller: DistributedId.parse(didVerificationMethod.controller),
      pubkey: didVerificationMethod.publicKeyBase58
        ? SolidPublicKey.parse(didVerificationMethod.publicKeyBase58)
        : undefined,
    });
  }
}

export class ServiceEndpoint extends Assignable {
  id: DistributedId;
  endpointType: string;
  endpoint: string;
  description: string;

  toDID(): DIDServiceEndpoint {
    return {
      id: this.id.toString(),
      type: this.endpointType,
      serviceEndpoint: this.endpoint,
      description: this.description,
    };
  }

  static parse(service: DIDServiceEndpoint): ServiceEndpoint {
    return new ServiceEndpoint({
      id: DistributedId.parse(service.id),
      endpointType: service.type,
      endpoint: service.serviceEndpoint,
      description: service.description,
    });
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

  toString(): string {
    const cluster = this.clusterType.mainnetBeta
      ? ''
      : `${this.clusterType.toString()}:`;
    const identifier = this.identifier === '' ? '' : `#${this.identifier}`;
    return `${DID_HEADER}:${DID_METHOD}:${cluster}${this.pubkey.toString()}${identifier}`;
  }

  static REGEX = new RegExp('^did:' + DID_METHOD + ':?(\\w*):(\\w+)#?(\\w*)$');

  static parse(did: string | DIDVerificationMethod): DistributedId {
    if (typeof did === 'string') {
      const matches = DistributedId.REGEX.exec(did);

      if (!matches) throw new Error('Invalid DID');
      return new DistributedId({
        clusterType: ClusterType.parse(matches[1]),
        pubkey: SolidPublicKey.parse(matches[2]),
        identifier: matches[3],
      });
    } else {
      throw new Error('Provided DID is not a string');
    }
  }

  static valid(did: string): boolean {
    try {
      DistributedId.parse(did);
      return true;
    } catch {
      return false;
    }
  }

  static empty(): DistributedId {
    return new DistributedId({
      clusterType: ClusterType.mainnetBeta(),
      pubkey: SolidPublicKey.empty(),
      identifier: '',
    });
  }

  static parseMaybeArray(
    dids: (string | DIDVerificationMethod)[] | undefined
  ): DistributedId[] {
    return dids ? dids.map(v => DistributedId.parse(v)) : [];
  }

  static create(
    pubkey: PublicKey,
    clusterType: ClusterType,
    identifier: string = ''
  ): DistributedId {
    return new DistributedId({
      pubkey: SolidPublicKey.fromPublicKey(pubkey),
      clusterType,
      identifier,
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

  static parse(pubkey: string): SolidPublicKey {
    return SolidPublicKey.fromPublicKey(new PublicKey(pubkey));
  }

  static fromPublicKey(publicKey: PublicKey): SolidPublicKey {
    return new SolidPublicKey({ bytes: Uint8Array.from(publicKey.toBuffer()) });
  }

  static empty(): SolidPublicKey {
    const bytes = new Array(32);
    bytes.fill(0);
    return new SolidPublicKey({ bytes });
  }
}

export class ClusterType extends Enum {
  testnet: Testnet;
  mainnetBeta: MainnetBeta;
  devnet: Devnet;
  development: Development;

  solanaUrl(): string {
    return this.development !== undefined
      ? 'http://localhost:8899'
      : clusterApiUrl(this.toCluster());
  }

  toString(): string {
    return this.development ? 'localnet' : this.toCluster();
  }

  toCluster(): Cluster {
    if (this.mainnetBeta) {
      return 'mainnet-beta';
    } else if (this.testnet) {
      return 'testnet';
    } else if (this.devnet) {
      return 'devnet';
    } else {
      throw new Error('Unknown cluster type');
    }
  }

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

  static parse(clusterString: string): ClusterType {
    switch (clusterString) {
      case 'testnet':
        return ClusterType.testnet();
      case 'devnet':
        return ClusterType.devnet();
      case 'localnet':
        return ClusterType.development();
      case 'mainnet-beta':
        return ClusterType.mainnetBeta();
      case '':
        return ClusterType.mainnetBeta();
      default:
        throw new Error(`Cluster string '${clusterString}' not recognized`);
    }
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
    ['verificationMethod', [VerificationMethod]],
    ['authentication', [DistributedId]],
    ['capabilityInvocation', [DistributedId]],
    ['capabilityDelegation', [DistributedId]],
    ['keyAgreement', [DistributedId]],
    ['assertionMethod', [DistributedId]],
    ['service', [ServiceEndpoint]],
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
SCHEMA.set(ServiceEndpoint, {
  kind: 'struct',
  fields: [
    ['id', DistributedId],
    ['endpointType', 'string'],
    ['endpoint', 'string'],
    ['description', 'string'],
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
