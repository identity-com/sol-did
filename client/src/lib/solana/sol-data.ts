import { clusterApiUrl, Cluster, PublicKey } from '@solana/web3.js';
import { Assignable, Enum, SCHEMA } from './solana-borsh';
import {
  DID_METHOD,
  DID_HEADER,
  SOL_CONTEXT_PREFIX,
  W3ID_CONTEXT,
  PROGRAM_ID,
} from '../constants';
import { encode } from 'bs58';
import { mergeWith, omit } from 'ramda';
import {
  DIDDocument,
  VerificationMethod as DIDVerificationMethod,
  ServiceEndpoint as DIDServiceEndpoint,
} from 'did-resolver';

export async function getPDAKeyFromAuthority(
  authority: PublicKey
): Promise<PublicKey> {
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [authority.toBuffer(), Buffer.from(DID_METHOD, 'utf8')],
    PROGRAM_ID
  );
  return publicKeyNonce[0];
}

// The current SOL method version
export const VERSION = '1';

// The identifier for a default verification method, i.e one inferred from the authority
export const DEFAULT_KEY_ID = 'default';

type Context = 'https://w3id.org/did/v1' | string | string[];

export type SolDataConstructor = {
  account?: SolPublicKey;
  authority?: SolPublicKey;
  cluster?: ClusterType;
  version?: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  keyAgreement?: string[];
  assertionMethod?: string[];
  service?: ServiceEndpoint[];
};

export class SolData extends Assignable {
  // derived
  account: SolPublicKey;
  authority: SolPublicKey;
  cluster: ClusterType;

  // persisted
  version: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  capabilityInvocation: string[];
  capabilityDelegation: string[];
  keyAgreement: string[];
  assertionMethod: string[];
  service: ServiceEndpoint[];

  constructor(constructor: SolDataConstructor) {
    super({
      account: constructor.account || SolPublicKey.empty(),
      authority: constructor.authority || SolPublicKey.empty(),
      cluster: constructor.cluster || ClusterType.mainnetBeta(),
      version: constructor.version || VERSION,
      verificationMethod: constructor.verificationMethod || [],
      authentication: constructor.authentication || [],
      capabilityInvocation: constructor.capabilityInvocation || [],
      capabilityDelegation: constructor.capabilityDelegation || [],
      keyAgreement: constructor.keyAgreement || [],
      assertionMethod: constructor.assertionMethod || [],
      service: constructor.service || [],
    });
  }

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

  forAuthority(authority: PublicKey): SolData {
    return new SolData({
      ...this,
      authority: SolPublicKey.fromPublicKey(authority),
    });
  }

  merge(other: Partial<SolData>, overwriteArrays = false): SolData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergeBehaviour = (a: any, b: any): any => {
      if (a && Array.isArray(a)) {
        return overwriteArrays && b ? b : [...a, ...b];
      }
      return b;
    };

    // merging data into a DID Document should not change its identifier (derived from the authority)
    const dataToMerge = omit(['authority', 'account'], other);

    const mergedData = mergeWith(mergeBehaviour, this, dataToMerge);
    return new SolData(mergedData);
  }

  static size(): number {
    return 1000;
  }

  static solContext(version: string = VERSION): string {
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
    return new SolData({
      cluster: clusterType,
      authority: SolPublicKey.fromPublicKey(authority),
      account: SolPublicKey.fromPublicKey(account),
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

  static async empty(authority?: PublicKey): Promise<Partial<SolData>> {
    return {
      authority: authority ? SolPublicKey.fromPublicKey(authority) : undefined,
      account: authority
        ? SolPublicKey.fromPublicKey(await getPDAKeyFromAuthority(authority))
        : undefined,
    };
  }

  identifier(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: this.cluster,
      authorityPubkey: this.authority,
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
      this.identifier().withUrl(urlField).toString();

    const verificationMethods = this.inferredVerificationMethods().map((v) =>
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
      service: this.service.map((v) => v.toDID(this.identifier())),
      publicKey: verificationMethods,
    };
  }

  // extract the version from a DID JSON-LD context, if the context is an array
  // and includes the Sol Context Prefix.
  // Otherwise, just return the default version.
  private static parseVersion(context: Context | undefined) {
    if (context && Array.isArray(context)) {
      const solContext = context.find((c) => c.startsWith(SOL_CONTEXT_PREFIX));

      if (solContext) return solContext.substring(SOL_CONTEXT_PREFIX.length);
    }

    return VERSION;
  }

  static parseDIDReferenceArray(
    dids: (string | DIDVerificationMethod)[] | undefined
  ): string[] {
    return DecentralizedIdentifier.parseMaybeArray(dids)
      .map((did) => did.urlField)
      .filter((val): val is string => val !== undefined);
  }

  static async parse(document: Partial<DIDDocument>): Promise<SolData> {
    const did = document.id
      ? DecentralizedIdentifier.parse(document.id)
      : DecentralizedIdentifier.empty();

    return new SolData({
      account: await did.pdaPubkey(),
      authority: did.authorityPubkey,
      cluster: did.clusterType,
      version: SolData.parseVersion(document['@context']),
      verificationMethod: document.verificationMethod
        ? document.verificationMethod.map((v) => VerificationMethod.parse(v))
        : [],
      authentication: SolData.parseDIDReferenceArray(document.authentication),
      capabilityInvocation: SolData.parseDIDReferenceArray(
        document.capabilityInvocation
      ),
      capabilityDelegation: SolData.parseDIDReferenceArray(
        document.capabilityDelegation
      ),
      keyAgreement: SolData.parseDIDReferenceArray(document.keyAgreement),
      assertionMethod: SolData.parseDIDReferenceArray(document.assertionMethod),
      service: document.service
        ? document.service.map((v) => ServiceEndpoint.parse(v))
        : [],
    });
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
      id: DecentralizedIdentifier.parse(didVerificationMethod.id).urlField,
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

export type DecentralizedIdentifierConstructor = {
  clusterType: ClusterType;
  authorityPubkey: SolPublicKey;
  urlField?: string;
};

/**
 * A class representing a SOL Did
 */
export class DecentralizedIdentifier extends Assignable {
  /**
   * The cluster the DID points to
   */
  clusterType: ClusterType;
  /**
   * The address of the DID
   */
  authorityPubkey: SolPublicKey;
  /**
   * The optional field following the DID address and `#`
   */
  urlField?: string;

  /**
   * Creates a new `DecentralizedIdentifier` from its requisite parts.
   *
   * Use `DecentralizedIdentifier::parse` to obtain this from a direct did address.
   *
   * @param constructor The construction values
   */
  constructor(constructor: DecentralizedIdentifierConstructor) {
    super({
      clusterType: constructor.clusterType,
      authorityPubkey: constructor.authorityPubkey,
      urlField: constructor.urlField,
    });
  }

  /**
   * Get the key to the DID data
   */
  async pdaPubkey(): Promise<SolPublicKey> {
    return SolPublicKey.fromPublicKey(
      await getPDAKeyFromAuthority(this.authorityPubkey.toPublicKey())
    );
  }

  async pdaSolanaPubkey(): Promise<PublicKey> {
    return this.pdaPubkey().then((key) => key.toPublicKey());
  }

  /**
   * Clones this
   */
  clone(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: this.clusterType,
      authorityPubkey: this.authorityPubkey,
      urlField: this.urlField,
    });
  }

  /**
   * Returns a new `DecentralizedIdentifier` but with `urlField` swapped to the parameter
   * @param urlField The new url field
   */
  withUrl(urlField: string): DecentralizedIdentifier {
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
    return `${DID_HEADER}:${DID_METHOD}:${cluster}${this.authorityPubkey.toString()}${urlField}`;
  }

  static REGEX = new RegExp('^did:' + DID_METHOD + ':?(\\w*):(\\w+)#?(\\w*)$');

  /**
   * Parses a given did string
   * @param did the did string
   */
  static parse(did: string | DIDVerificationMethod): DecentralizedIdentifier {
    if (typeof did == 'string') {
      const matches = DecentralizedIdentifier.REGEX.exec(did);

      if (!matches) throw new Error('Invalid DID');

      console.log(matches);
      const authorityPubkey = SolPublicKey.parse(matches[2]);

      return new DecentralizedIdentifier({
        clusterType: ClusterType.parse(matches[1]),
        authorityPubkey,
        urlField: matches[3],
      });
    } else {
      throw new Error('Provided DID is not a string');
    }
  }

  /**
   * Returns true if the did is valid
   * @param did The did string to check
   */
  static valid(did: string): boolean {
    try {
      DecentralizedIdentifier.parse(did);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns an empty did
   */
  static empty(): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      clusterType: ClusterType.mainnetBeta(),
      authorityPubkey: SolPublicKey.empty(),
      urlField: '',
    });
  }

  /**
   * Parses an array of did strings
   * @param dids The did strings to parse
   */
  static parseMaybeArray(
    dids?: (string | DIDVerificationMethod)[]
  ): DecentralizedIdentifier[] {
    return dids ? dids.map((v) => DecentralizedIdentifier.parse(v)) : [];
  }

  /**
   * Creates a new did
   * @param authorityPubkey The authority and key of the did
   * @param clusterType The cluster the did points to
   * @param urlField An optional extra field
   */
  static create(
    authorityPubkey: PublicKey,
    clusterType: ClusterType,
    urlField?: string
  ): DecentralizedIdentifier {
    return new DecentralizedIdentifier({
      authorityPubkey: SolPublicKey.fromPublicKey(authorityPubkey),
      clusterType,
      urlField,
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

  /**
   * Returns this as the portion of the DID string
   */
  toDIDString(): string {
    if (this.testnet) {
      return ':testnet';
    } else if (this.mainnetBeta) {
      return '';
    } else if (this.devnet) {
      return ':devnet';
    } else if (this.development) {
      return ':localnet';
    }
    throw new Error('Unknown `ClusterType`: ' + this);
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
