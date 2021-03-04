import { register } from '../../src';
import { SolanaUtil } from '../../src/solana-util';
import { Account, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from './constants';
import { RegisterRequest } from '../../src/util';

describe('register', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let payer: Account;

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
  }, 60000);

  it('registers a DID on the blockchain', async () => {
    const registerRequest: RegisterRequest = {
      payer: payer.secretKey,
      cluster: CLUSTER,
    };
    const res = await register(registerRequest);

    console.log(res);
  }, 30000);
});
