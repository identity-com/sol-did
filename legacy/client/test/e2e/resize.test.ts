import { DecentralizedIdentifier, resize, resolve } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { getPDAKeyFromAuthority, SolData } from '../../src';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';
import { makeService } from '../util';
import { ResizeRequest } from '../../src/lib/util';

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
      owner: owner.secretKey,
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

    // ensure the doc contains the service
    expect(doc.service).toEqual([service]);
    expect(doc.id).toEqual(identifier);
  });
});
