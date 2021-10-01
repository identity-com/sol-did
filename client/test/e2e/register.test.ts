import { register, resolve, RegisterRequest } from '../../src';
import { SolanaUtil } from '../../src';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { DecentralizedIdentifier } from '../../src';
import { makeService } from '../util';
import { SOL_CONTEXT_PREFIX, W3ID_CONTEXT } from '../../src/lib/constants';

describe('register', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let payer: Keypair;
  let owner: Keypair;

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
  }, 60000);

  beforeEach(() => {
    owner = Keypair.generate();
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

  it('registers a DID with a different version', async () => {
    const version = '2.3.4';

    const registerRequest: RegisterRequest = {
      payer: payer.secretKey,
      cluster: CLUSTER,
      owner: owner.publicKey.toBase58(),
      document: {
        '@context': [W3ID_CONTEXT, SOL_CONTEXT_PREFIX + version],
      },
    };
    const identifier = await register(registerRequest);

    const doc = await resolve(identifier);

    console.log(JSON.stringify(doc, null, 1));

    // ensure the doc contains the correct version in the context field
    const context = doc['@context'];
    expect(context).toEqual([W3ID_CONTEXT, SOL_CONTEXT_PREFIX + version]);
  }, 30000);

  it('registers a DID with a size', async () => {
    const registerRequest: RegisterRequest = {
      payer: payer.secretKey,
      cluster: CLUSTER,
      owner: owner.publicKey.toBase58(),
      size: 70,
    };
    const identifier = await register(registerRequest);

    expect(DecentralizedIdentifier.valid(identifier)).toBeTruthy();

    console.log(identifier);
  }, 30000);
});
