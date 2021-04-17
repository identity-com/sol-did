import { clusterApiUrl, Cluster, PublicKey, Account } from '@solana/web3.js';
import { Assignable, Enum, SCHEMA } from './solana-borsh';
import {
  DID_METHOD,
  DID_HEADER,
  SOL_CONTEXT_PREFIX,
  W3ID_CONTEXT,
} from '../constants';
import { encode } from 'bs58';
import { mergeWith, omit } from 'ramda';
import {
  DIDDocument,
  VerificationMethod as DIDVerificationMethod,
  ServiceEndpoint as DIDServiceEndpoint,
} from 'did-resolver';

// The current SOL method version
export const VERSION = '1';

// The identifier for a default verification method, i.e one inferred from the authority
export const DEFAULT_KEY_ID = 'default';

type Context = 'https://w3id.org/did/v1' | string | string[];

export class SolData extends Assignable {
  // derived
  account: SolPublicKey;
  cluster: ClusterType;

  // persisted
  authority: SolPublicKey;
  version: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
  keyAgreement: string[];
  assertionMethod: string[];
  service: ServiceEndpoint[];

  static fromAccount(
    accountKey: PublicKey,
    accountData: Buffer,
    cluster: ClusterType
  ): SolData {
    const solData = SolData.decode<SolData>(accountData);
    solData.cluster = cluster;
    solData.account = SolPublicKey.fromPublicKey(accountKey);
    return solData;
  }

  forAuthority(authority: PublicKey) {
    return new SolData({
      ...this,
      authority: SolPublicKey.fromPublicKey(authority),
    });
  }

  merge(other: Partial<SolData>, overwriteArrays: boolean = false): SolData {
    const mergeBehaviour = (a: any, b: any): any => {
      if (a && Array.isArray(a)) {
        return overwriteArrays && b ? b : [...a, ...b];
      }
      return b;
    };

    // merging data into a DID Document should not change its identifier (derived from the authority)
    const dataToMerge = omit(['authority'], other);

    const mergedData = mergeWith(mergeBehaviour, this, dataToMerge);
    return new SolData(mergedData);
  }

  static size(): number {
    return 1000;
  }

  static solContext(version: string = VERSION) {
    return SOL_CONTEXT_PREFIX + version;
  }

  static defaultContext(version: string = VERSION): string[] {
    return [W3ID_CONTEXT, SolData.solContext(version)];
  }

  static sparse(
    account: PublicKey,
    authority: PublicKey,
    clusterType: ClusterType
  ): SolData {
    const emptySolData = SolData.empty(authority);

    return emptySolData.merge({
      version: VERSION,
      account: SolPublicKey.fromPublicKey(account),
      authority: SolPublicKey.fromPublicKey(authority),
      cluster: clusterType,
    });
  }

  static empty(authority?: PublicKey): SolData {
    return new SolData({
      cluster: ClusterType.mainnetBeta(),
      authority: SolPublicKey.fromPublicKey(
        authority || new Account().publicKey
      ),

      version: VERSION,
      verificationMethod: [],
      authentication: [],
      capabilityInvocation: [],
      capabilityDelegation: [],
      keyAgreement: [],
      assertionMethod: [],
      service: [],
    });
  }

  identifier(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: this.cluster,
      pubkey: this.account,
    });
  }

  /**
   * Infers a set of verification methods by combining:
   * 1. The authority
   * 2. the explicit verification methods stored in the document
   *
   * Should match the program function state.rs SolData.inferred_verification_methods
   */
  inferredVerificationMethods(): VerificationMethod[] {
    return [
      VerificationMethod.newPublicKey(this.authority.toPublicKey()),
      ...this.verificationMethod,
    ];
  }

  /*
   * Infers a set of capability invocations from either:
   * 1. The authority
   * 2. the explicit capability invocations stored in the document
   * By default, the authority is also the key that is allowed to update or delete the DID,
   * However, if an explicit capability invocation list is specified, this can be overruled,
   * allowing revocability of lost keys while retaining the original DID identifier (which is
   * derived from the authority)
   *
   * Should match the program function state.rs SolData.inferred_capability_invocation
   */
  inferredCapabilityInvocation(): string[] {
    return this.capabilityInvocation && this.capabilityInvocation.length
      ? this.capabilityInvocation
      : [DEFAULT_KEY_ID];
  }

  toDIDDocument(): DIDDocument {
    const deriveDID = (urlField: string) =>
      this.identifier()
        .withUrl(urlField)
        .toString();

    const verificationMethods = this.inferredVerificationMethods().map(v =>
      v.toDID(this.identifier())
    );
    return {
      '@context': SolData.defaultContext(this.version),
      id: this.identifier().toString(),
      verificationMethod: verificationMethods,
      authentication: this.authentication.map(deriveDID),
      assertionMethod: this.assertionMethod.map(deriveDID),
      keyAgreement: this.keyAgreement.map(deriveDID),
      capabilityInvocation: this.inferredCapabilityInvocation().map(deriveDID),
      capabilityDelegation: this.capabilityDelegation.map(deriveDID),
      service: this.service.map(v => v.toDID(this.identifier())),
      publicKey: verificationMethods,
    };
  }

  // extract the version from a DID JSON-LD context, if the context is an array
  // and includes the Sol Context Prefix.
  // Otherwise, just return the default version.
  private static parseVersion(context: Context | undefined) {
    if (context && Array.isArray(context)) {
      const solContext = context.find(c => c.startsWith(SOL_CONTEXT_PREFIX));

      if (solContext) return solContext.substring(SOL_CONTEXT_PREFIX.length);
    }

    return VERSION;
  }

  static parse(document: Partial<DIDDocument> | undefined): SolData {
    if (document) {
      return new SolData({
        version: SolData.parseVersion(document['@context']),
        did: document.id
          ? DecentralizedIdentifier.parse(document.id)
          : DecentralizedIdentifier.empty(),
        verificationMethod: document.verificationMethod
          ? document.verificationMethod.map(v => VerificationMethod.parse(v))
          : [],
        authentication: DecentralizedIdentifier.parseMaybeArray(
          document.authentication
        ),
        capabilityInvocation: DecentralizedIdentifier.parseMaybeArray(
          document.capabilityInvocation
        ),
        capabilityDelegation: DecentralizedIdentifier.parseMaybeArray(
          document.capabilityDelegation
        ),
        keyAgreement: DecentralizedIdentifier.parseMaybeArray(
          document.keyAgreement
        ),
        assertionMethod: DecentralizedIdentifier.parseMaybeArray(
          document.assertionMethod
        ),
        service: document.service
          ? document.service.map(v => ServiceEndpoint.parse(v))
          : [],
      });
    } else {
      return SolData.empty();
    }
  }
}

export class VerificationMethod extends Assignable {
  id: string;
  verificationType: string;
  controller: DecentralizedIdentifier;
  pubkey: SolPublicKey;

  static defaultVerificationType(): string {
    return 'Ed25519VerificationKey2018';
  }

  static newPublicKey(
    authority: PublicKey,
    id = DEFAULT_KEY_ID
  ): VerificationMethod {
    const verificationType = VerificationMethod.defaultVerificationType();
    const pubkey = SolPublicKey.fromPublicKey(authority);
    return new VerificationMethod({ id, verificationType, pubkey });
  }

  toDID(parentDID: DecentralizedIdentifier): DIDVerificationMethod {
    return {
      id: parentDID.withUrl(this.id).toString(),
      type: this.verificationType,
      controller: parentDID.toString(),
      publicKeyBase58: this.pubkey.toString(),
    };
  }

  static parse(
    didVerificationMethod: DIDVerificationMethod
  ): VerificationMethod {
    return new VerificationMethod({
      id: DecentralizedIdentifier.parse(didVerificationMethod.id),
      verificationType: didVerificationMethod.type,
      controller: DecentralizedIdentifier.parse(
        didVerificationMethod.controller
      ),
      pubkey: didVerificationMethod.publicKeyBase58
        ? SolPublicKey.parse(didVerificationMethod.publicKeyBase58)
        : undefined,
    });
  }
}

export class ServiceEndpoint extends Assignable {
  id: string;
  endpointType: string;
  endpoint: string;
  description: string;

  toDID(parentDID: DecentralizedIdentifier): DIDServiceEndpoint {
    return {
      id: parentDID.withUrl(this.id).toString(),
      type: this.endpointType,
      serviceEndpoint: this.endpoint,
      description: this.description,
    };
  }

  static parse(service: DIDServiceEndpoint): ServiceEndpoint {
    return new ServiceEndpoint({
      id: DecentralizedIdentifier.parse(service.id).urlField,
      endpointType: service.type,
      endpoint: service.serviceEndpoint,
      description: service.description,
    });
  }
}

export class DecentralizedIdentifier extends Assignable {
  clusterType: ClusterType;
  pubkey: SolPublicKey;
  urlField: string;

  clone(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: this.clusterType,
      pubkey: this.pubkey,
      urlField: this.urlField,
    });
  }

  withUrl(urlField: string) {
    return new DecentralizedIdentifier({
      ...this,
      urlField,
    });
  }

  toString(): string {
    const cluster = this.clusterType.mainnetBeta
      ? ''
      : `${this.clusterType.toString()}:`;
    const urlField =
      !this.urlField || this.urlField === '' ? '' : `#${this.urlField}`; // TODO add support for / urls
    return `${DID_HEADER}:${DID_METHOD}:${cluster}${this.pubkey.toString()}${urlField}`;
  }

  static REGEX = new RegExp('^did:' + DID_METHOD + ':?(\\w*):(\\w+)#?(\\w*)$');

  static parse(did: string | DIDVerificationMethod): DecentralizedIdentifier {
    if (typeof did === 'string') {
      const matches = DecentralizedIdentifier.REGEX.exec(did);

      if (!matches) throw new Error('Invalid DID');
      return new DecentralizedIdentifier({
        clusterType: ClusterType.parse(matches[1]),
        pubkey: SolPublicKey.parse(matches[2]),
        urlField: matches[3],
      });
    } else {
      throw new Error('Provided DID is not a string');
    }
  }

  static valid(did: string): boolean {
    try {
      DecentralizedIdentifier.parse(did);
      return true;
    } catch {
      return false;
    }
  }

  static empty(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: ClusterType.mainnetBeta(),
      pubkey: SolPublicKey.empty(),
      identifier: '',
    });
  }

  static parseMaybeArray(
    dids: (string | DIDVerificationMethod)[] | undefined
  ): DecentralizedIdentifier[] {
    return dids ? dids.map(v => DecentralizedIdentifier.parse(v)) : [];
  }

  static create(
    pubkey: PublicKey,
    clusterType: ClusterType,
    identifier: string = ''
  ): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      pubkey: SolPublicKey.fromPublicKey(pubkey),
      clusterType,
      identifier,
    });
  }
}

export class SolPublicKey extends Assignable {
  // The public key bytes
  bytes: number[];

  toPublicKey(): PublicKey {
    return new PublicKey(this.bytes);
  }

  toString(): string {
    return encode(this.bytes);
  }

  static parse(pubkey: string): SolPublicKey {
    return SolPublicKey.fromPublicKey(new PublicKey(pubkey));
  }

  static fromPublicKey(publicKey: PublicKey): SolPublicKey {
    return new SolPublicKey({ bytes: Uint8Array.from(publicKey.toBuffer()) });
  }

  static empty(): SolPublicKey {
    const bytes = new Array(32);
    bytes.fill(0);
    return new SolPublicKey({ bytes });
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

SCHEMA.set(SolData, {
  kind: 'struct',
  fields: [
    ['authority', SolPublicKey],
    ['version', 'string'],
    ['verificationMethod', [VerificationMethod]],
    ['authentication', ['string']],
    ['capabilityInvocation', ['string']],
    ['capabilityDelegation', ['string']],
    ['keyAgreement', ['string']],
    ['assertionMethod', ['string']],
    ['service', [ServiceEndpoint]],
  ],
});
SCHEMA.set(VerificationMethod, {
  kind: 'struct',
  fields: [
    ['id', 'string'],
    ['verificationType', 'string'],
    ['pubkey', SolPublicKey],
  ],
});
SCHEMA.set(DecentralizedIdentifier, {
  kind: 'struct',
  fields: [
    ['solData', SolData],
    ['identifier', 'string'],
  ],
});
SCHEMA.set(ServiceEndpoint, {
  kind: 'struct',
  fields: [
    ['id', 'string'],
    ['endpointType', 'string'],
    ['endpoint', 'string'],
    ['description', 'string'],
  ],
});
SCHEMA.set(SolPublicKey, {
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
