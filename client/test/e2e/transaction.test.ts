import { Account, Connection } from '@solana/web3.js';
import { SolidTransaction } from '../../src/transaction';
import { SolidData } from '../../src/solid-data';
import { SolanaUtil } from '../../src/solana-util';
import { strict as assert } from 'assert';

const VALIDATOR_URL = "http://127.0.0.1:8899";

describe('transaction', () => {
  it('create works', async () => {
    const connection = new Connection(VALIDATOR_URL, 'recent');
    const payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    const authority = new Account();
    const solidKey = await SolidTransaction.createSolid(connection, payer, authority);
    const solid = await SolidTransaction.getSolid(connection, solidKey.publicKey);
    assert.notEqual(solid, null);
    const checkSolid = SolidData.newSparse(solidKey.publicKey, authority.publicKey);
    assert.deepEqual(solid, checkSolid);
  });
});
