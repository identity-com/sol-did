import { resolve } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolData, getPDAKeyFromAuthority } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('resolve', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let authority: Keypair;
  let pdaAccount: PublicKey;

  beforeAll(async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    authority = Keypair.generate();
    await SolTransaction.createDID(
      connection,
      payer,
      authority.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      await SolData.empty()
    );
    pdaAccount = await getPDAKeyFromAuthority(authority.publicKey);
  }, 60000);

  it('looks up a DID from the blockchain', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + authority.publicKey.toBase58();
    const document = await resolve(did);

    console.log(document);
    const expectedDocument = (
      await SolData.sparse(pdaAccount, authority.publicKey, CLUSTER)
    ).toDIDDocument();
    return expect(document).toMatchObject(expectedDocument);
  });
});
