import { register, resolve } from '../../src';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { Account, Connection } from '@solana/web3.js';
import { ServiceEndpoint } from 'did-resolver';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { RegisterRequest } from '../../src/lib/util';
import { DistributedId, SolidPublicKey } from '../../src/lib/solana/solid-data';

describe('register', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let payer: Account;
  let owner: Account;

  const makeService = async (owner: Account): Promise<ServiceEndpoint> => {
    const identifier = new DistributedId({
      clusterType: CLUSTER,
      pubkey: SolidPublicKey.fromPublicKey(owner.publicKey),
      identifier: '',
    }).toString();

    return {
      description: 'Messaging Service',
      id: `${identifier}#service1`,
      serviceEndpoint: `https://dummmy.dummy/${identifier}`,
      type: 'Messaging',
    };
  };

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
  }, 60000);

  beforeEach(() => {
    owner = new Account();
  });

  it('registers a sparse DID on the blockchain', async () => {
    const registerRequest: RegisterRequest = {
      payer: payer.secretKey,
      cluster: CLUSTER,
      owner: owner.publicKey.toBase58(),
    };
    const identifier = await register(registerRequest);

    expect(DistributedId.valid(identifier)).toBeTruthy();

    console.log(identifier);
  }, 30000);

  it('registers a DID with a document', async () => {
    const service = await makeService(owner);

    const registerRequest: RegisterRequest = {
      payer: payer.secretKey,
      cluster: CLUSTER,
      owner: owner.publicKey.toBase58(),
      document: {
        service: [service],
      },
    };
    const identifier = await register(registerRequest);

    const doc = await resolve(identifier);

    console.log({ service, doc });

    expect(doc.service).toEqual([service]);
  }, 30000);
});
