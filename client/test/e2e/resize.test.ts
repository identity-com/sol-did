import {
  DecentralizedIdentifier,
  resize,
  resolve,
  update,
  UpdateRequest,
} from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { getPDAKeyFromAuthority, SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { makeService, makeVerificationMethod } from '../util';
import { ServiceEndpoint } from 'did-resolver';
import { ResizeRequest } from '../../src/lib/util';

const makeServiceRequest = (
  payer: Keypair,
  did: string,
  service: ServiceEndpoint
) => ({
  payer: payer.secretKey,
  did,
  document: {
    service: [service],
  },
});

describe('resize', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let owner: Keypair;
  let payer: Keypair;

  beforeEach(async () => {
    owner = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);

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

  it('can resize into a larger account.', async () => {
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
    const service = await makeService(owner);
    const SIZE_INCREASE = 100;
    const request: ResizeRequest = {
      did: identifier,
      payer: payer.secretKey,
      size: DEFAULT_DOCUMENT_SIZE + SIZE_INCREASE,
      cluster: CLUSTER,
      owner: owner.publicKey.toBase58(),
      document: {
        service: [service],
      },
    };

    const id = DecentralizedIdentifier.parse(identifier);
    const recordKey = await id.pdaSolanaPubkey();

    const data_before = await connection.getAccountInfo(recordKey);
    expect(data_before?.data.length).toEqual(DEFAULT_DOCUMENT_SIZE);

    await resize(request);

    const doc = await resolve(identifier);

    const data_after = await connection.getAccountInfo(recordKey);
    expect(data_after?.data.length).toEqual(
      DEFAULT_DOCUMENT_SIZE + SIZE_INCREASE
    );

    // check size

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
    expect(doc.id).toEqual(identifier);
  });

  it.skip('adds a key to a DID', async () => {
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
    const key = await makeVerificationMethod(owner);
    const request: UpdateRequest = {
      payer: owner.secretKey,
      did: identifier,
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

  it.skip('adds a service to a DID with a separate payer', async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const identifier = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();
    const service = await makeService(owner);
    const request: UpdateRequest = {
      payer: payer.secretKey,
      owner: owner.secretKey,
      did: identifier,
      document: {
        service: [service],
      },
    };

    await update(request);

    const doc = await resolve(identifier);

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
  });

  it.skip('adds a service to a DID with an existing service', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();

    const service1 = await makeService(owner);
    const service2 = await makeService(owner);

    const request1: UpdateRequest = makeServiceRequest(owner, did, service1);
    const request2: UpdateRequest = makeServiceRequest(owner, did, service2);

    // add the services individually
    await update(request1);
    await update(request2);

    const doc = await resolve(did);

    console.log(JSON.stringify(doc, null, 1));

    // ensure the doc contains the service
    expect(doc.service).toEqual([service1, service2]);
  });

  it.skip('adds a controller to a did', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + owner.publicKey.toBase58();

    const controller = Keypair.generate().publicKey;
    const controller_id = DecentralizedIdentifier.create(
      controller,
      CLUSTER
    ).toString();
    const request: UpdateRequest = {
      did,
      payer: owner.secretKey,
      document: {
        controller: controller_id,
      },
    };

    await update(request);

    const doc = await resolve(did);

    console.log(JSON.stringify(doc, null, 1));

    expect(doc.controller).toEqual([controller_id]);
  });
});
