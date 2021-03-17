import { resolve } from '../../src';
import { SolidData } from '../../src/lib/solana/solid-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { SolidTransaction } from '../../src/lib/solana/transaction';
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('resolve', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let solidDIDKey: PublicKey;
  let authority: Account;

  beforeAll(async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    authority = new Account();
    solidDIDKey = await SolidTransaction.createSolid(
      connection,
      payer,
      authority.publicKey,
      SolidData.empty()
    );
  }, 60000);

  it('looks up a DID from the blockchain', async () => {
    const did = 'did:solid:' + CLUSTER + ':' + solidDIDKey.toBase58();
    const document = await resolve(did);

    console.log(document);
    const expectedDocument = SolidData.sparse(
      solidDIDKey,
      authority.publicKey,
      CLUSTER
    ).toDIDDocument();
    return expect(document).toMatchObject(expectedDocument);
  });
});
