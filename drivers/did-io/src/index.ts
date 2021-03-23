import {
  PublicKeyBase58,
  PrivateKey,
  ClusterType,
} from '@identity.com/solid-did-client';
import * as DID from '@identity.com/solid-did-client';
import { Cluster } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';

type Properties = {
  payer: PrivateKey;
};

type GetParameters = {
  did: string;
};

type RegisterParameters = {
  key: PublicKeyBase58;
  size: number;
  cluster: 'localnet' | Cluster;
};

export class Driver {
  private payer: PrivateKey;

  constructor({ payer }: Properties) {
    this.payer = payer;
  }

  async get({ did }: GetParameters): Promise<DIDDocument> {
    return DID.resolve(did);
  }

  async register({ key, size = 1000, cluster }: RegisterParameters) {
    return DID.register({
      owner: key,
      payer: this.payer,
      size,
      cluster: ClusterType.parse(cluster),
    });
  }
}

const driver = (properties: Properties) => new Driver(properties);

export default { driver };
