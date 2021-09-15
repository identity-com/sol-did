import { resolve, update, UpdateRequest } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { getPDAKeyFromAuthority, SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { makeService, makeVerificationMethod } from '../util';
import { ServiceEndpoint } from 'did-resolver';

const makeServiceRequest = (
  payer: Keypair,
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
  let owner: Keypair;

  beforeEach(async () => {
    owner = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    await SolTransaction.createDID(
      connection,
      owner,
      owner.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.sparse(
        await getPDAKeyFromAuthority(owner.publicKey),
        owner.publicKey,
        CLUSTER
      )
    );
  }, 60000);

  it('adds a service to a DID', async () => {
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
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
    expect(doc.id).toEqual(identifier);
  });

  it('adds a key to a DID', async () => {
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
    const key = await makeVerificationMethod(owner);
    const request: UpdateRequest = {
      payer: owner.secretKey,
      identifier,
      document: {
        verificationMethod: [key],
        capabilityInvocation: [key.id],
      },
    };

    await update(request);

    const doc = await resolve(identifier);

    // ensure the doc contains the key
    expect(doc.verificationMethod?.length).toEqual(2);
    expect(doc.id).toEqual(identifier);
  });

  it('adds a service to a DID with a separate payer', async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
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
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();

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
