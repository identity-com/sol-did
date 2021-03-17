import { register, resolve, RegisterRequest } from '../../src';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { Account, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { DecentralizedIdentifier } from '../../src/lib/solana/solid-data';
import { makeService } from '../util';

describe('register', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let payer: Account;
  let owner: Account;

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

    expect(DecentralizedIdentifier.valid(identifier)).toBeTruthy();

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

    console.log({ service, doc: JSON.stringify(doc, null, 1) });

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
  }, 30000);
});
