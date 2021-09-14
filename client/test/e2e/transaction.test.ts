import { Keypair, Connection } from '@solana/web3.js';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { SolData, getPDAKeyFromAuthority } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { strict as assert } from 'assert';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('transaction', () => {
  it('create works', async () => {
    const connection = new Connection(VALIDATOR_URL, 'recent');
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const authority = Keypair.generate();
    const pdaAccount = await getPDAKeyFromAuthority(authority.publicKey);
    await SolTransaction.createDID(
      connection,
      payer,
      authority.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      await SolData.sparse(pdaAccount, authority.publicKey, CLUSTER)
    );
    const sol = await SolTransaction.getSol(connection, CLUSTER, pdaAccount);
    assert.notEqual(sol, null);
    const checkSol = await SolData.sparse(
      pdaAccount,
      authority.publicKey,
      CLUSTER
    );
    assert.deepEqual(sol, checkSol);
    const solFromAuthority = await SolTransaction.getSolFromAuthority(
      connection,
      CLUSTER,
      authority.publicKey
    );
    assert.deepEqual(solFromAuthority, checkSol);
  });
});
