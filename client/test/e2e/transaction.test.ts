import { Account, Connection } from '@solana/web3.js';
import { SolidTransaction } from '../../src/transaction';
import { ClusterType, SolidData } from '../../src/solid-data';
import { SolanaUtil } from '../../src/solana-util';
import { strict as assert } from 'assert';
import { VALIDATOR_URL } from './constants';

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
      ClusterType.development()
    );
    const solid = await SolidTransaction.getSolid(connection, solidKey);
    assert.notEqual(solid, null);
    const checkSolid = SolidData.sparse(
      solidKey,
      authority.publicKey,
      ClusterType.development()
    );
    assert.deepEqual(solid, checkSolid);
    const solidFromAuthority = await SolidTransaction.getSolidFromAuthority(
      connection,
      authority.publicKey
    );
    assert.deepEqual(solidFromAuthority, checkSolid);
  });
});
