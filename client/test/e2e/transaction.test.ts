import { Account, Connection } from '@solana/web3.js';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { strict as assert } from 'assert';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('transaction', () => {
  it('create works', async () => {
    const connection = new Connection(VALIDATOR_URL, 'recent');
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const authority = new Account();
    const solKey = await SolTransaction.createSol(
      connection,
      payer,
      authority.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.empty()
    );
    const sol = await SolTransaction.getSol(connection, CLUSTER, solKey);
    assert.notEqual(sol, null);
    const checkSol = SolData.sparse(solKey, authority.publicKey, CLUSTER);
    assert.deepEqual(sol, checkSol);
    const solFromAuthority = await SolTransaction.getSolFromAuthority(
      connection,
      CLUSTER,
      authority.publicKey
    );
    assert.deepEqual(solFromAuthority, checkSol);
  });
});
