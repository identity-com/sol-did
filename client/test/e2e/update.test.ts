import { resolve, update, UpdateRequest } from '../../src';
import { SolidData } from '../../src/lib/solana/solid-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { SolidTransaction } from '../../src/lib/solana/transaction';
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { makeService } from '../util';
import { ServiceEndpoint } from 'did-resolver';

const makeServiceRequest = (
  payer: Account,
  identifier: string,
  service: ServiceEndpoint
) => ({
  payer: payer.secretKey,
  identifier,
  document: {
    service: [service],
  },
});

describe('update', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let solidDIDKey: PublicKey;
  let owner: Account;

  beforeEach(async () => {
    owner = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    solidDIDKey = await SolidTransaction.createSolid(
      connection,
      owner,
      owner.publicKey,
      SolidData.empty()
    );
  }, 60000);

  it('adds a service to a DID', async () => {
    const identifier = 'did:solid:' + CLUSTER + ':' + solidDIDKey.toBase58();
    const service = await makeService(owner);
    const request: UpdateRequest = {
      payer: owner.secretKey,
      identifier,
      document: {
        service: [service],
      },
    };

    await update(request);

    const doc = await resolve(identifier);

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
  });

  it('adds a service to a DID with a separate payer', async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const identifier = 'did:solid:' + CLUSTER + ':' + solidDIDKey.toBase58();
    const service = await makeService(owner);
    const request: UpdateRequest = {
      payer: payer.secretKey,
      owner: owner.secretKey,
      identifier,
      document: {
        service: [service],
      },
    };

    await update(request);

    const doc = await resolve(identifier);

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
  });

  it('adds a service to a DID with an existing service', async () => {
    const identifier = 'did:solid:' + CLUSTER + ':' + solidDIDKey.toBase58();

    const service1 = await makeService(owner);
    const service2 = await makeService(owner);

    const request1: UpdateRequest = makeServiceRequest(
      owner,
      identifier,
      service1
    );
    const request2: UpdateRequest = makeServiceRequest(
      owner,
      identifier,
      service2
    );

    // add the services individually
    await update(request1);
    await update(request2);

    const doc = await resolve(identifier);

    console.log(JSON.stringify(doc, null, 1));

    // ensure the doc contains the service
    expect(doc.service).toEqual([service1, service2]);
  });
});
