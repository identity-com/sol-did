import { Account, Connection } from '@solana/web3.js';
import { SolidTransaction } from '../../src/lib/solana/transaction';
import { SolidData } from '../../src/lib/solana/solid-data';
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
    const solidKey = await SolidTransaction.createSolid(
      connection,
      payer,
      authority.publicKey,
      CLUSTER
    );
    const solid = await SolidTransaction.getSolid(connection, solidKey);
    assert.notEqual(solid, null);
    const checkSolid = SolidData.sparse(solidKey, authority.publicKey, CLUSTER);
    assert.deepEqual(solid, checkSolid);
    const solidFromAuthority = await SolidTransaction.getSolidFromAuthority(
      connection,
      authority.publicKey
    );
    assert.deepEqual(solidFromAuthority, checkSolid);
  });
});
