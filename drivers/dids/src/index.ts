import {
  ClusterType,
  PrivateKey,
  PublicKeyBase58,
} from '@identity.com/solid-did-client';
import DIDKey from 'did-method-key';
import * as DIDSolid from '@identity.com/solid-did-client';
import { Cluster, PublicKey } from '@solana/web3.js';
import { normalizeDidKeyDocument, publicKeyBase58ToCryptoLD } from './util';
import { DIDDocument } from 'did-resolver';

const didKey = DIDKey.driver();

type ExtendedCluster = Cluster | 'localnet';

type Properties = {
  payer: PrivateKey;
  cluster?: ExtendedCluster;
  maxDocumentSize?: number;
};

type Method = 'solid' | 'key';

const isPublicKeyBase50 = (
  key: PublicKeyBase58 | PublicKey
): key is PublicKeyBase58 => typeof key === 'string' || key instanceof String;

export class DIDs {
  private payer: PrivateKey;
  private cluster?: ExtendedCluster;
  private maxDocumentSize?: number;

  constructor({ payer, cluster, maxDocumentSize }: Properties) {
    this.payer = payer;
    this.cluster = cluster;
    this.maxDocumentSize = maxDocumentSize;
  }

  async register(
    method: Method,
    owner: PublicKeyBase58 | PublicKey
  ): Promise<string> {
    const normalizedKey = isPublicKeyBase50(owner) ? owner : owner.toBase58();

    if (method === 'key') {
      const cryptoLDKey = await publicKeyBase58ToCryptoLD(normalizedKey);

      const document = await didKey.keyToDidDoc(cryptoLDKey);

      return document.id;
    } else if (method === 'solid') {
      return DIDSolid.register({
        payer: this.payer,
        owner: normalizedKey,
        cluster: this.cluster && ClusterType.parse(this.cluster),
        size: this.maxDocumentSize,
      });
    }

    throw new Error('Unsupported DID method ' + method);
  }

  async get(identifier: string): Promise<DIDDocument> {
    if (identifier.startsWith('did:key:')) {
      return didKey.get({ did: identifier }).then(normalizeDidKeyDocument);
    } else if (identifier.startsWith('did:solid:')) {
      return DIDSolid.resolve(identifier);
    }

    throw new Error('Unsupported method for DID ' + identifier);
  }
}
