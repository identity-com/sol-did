import { resolve } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('resolve', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let solDIDKey: PublicKey;
  let authority: Account;

  beforeAll(async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    authority = new Account();
    solDIDKey = await SolTransaction.createDID(
      connection,
      payer,
      authority.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.empty()
    );
  }, 60000);

  it('looks up a DID from the blockchain', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + solDIDKey.toBase58();
    const document = await resolve(did);

    console.log(document);
    const expectedDocument = SolData.sparse(
      solDIDKey,
      authority.publicKey,
      CLUSTER
    ).toDIDDocument();
    return expect(document).toMatchObject(expectedDocument);
  });
});
