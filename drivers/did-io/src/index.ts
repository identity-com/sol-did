import {
  PublicKeyBase58,
  PrivateKey,
  ClusterType,
} from '@identity.com/sol-did-client';
import * as DID from '@identity.com/sol-did-client';
import {Cluster, Keypair} from '@solana/web3.js';
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
  public readonly method: string = 'sol';

  constructor({ payer }: Properties) {
    this.payer = payer;
  }

  async get({ did }: GetParameters): Promise<DIDDocument> {
    return DID.resolve(did);
  }

  async generate({ size = 1000, cluster }: RegisterParameters) {
    const keypair = Keypair.generate();

    const did = await DID.register({
      owner: keypair.publicKey.toBase58(),
      payer: this.payer,
      size,
      cluster: ClusterType.parse(cluster),
    });

    const didDocument = await DID.resolve(did);

    return {didDocument};
  }
}

const driver = (properties: Properties) => new Driver(properties);

export default { driver };
