import { resolve, deactivate, DeactivateRequest } from '../../src';
import { SolidData } from '../../src/lib/solana/solid-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { SolidTransaction } from '../../src/lib/solana/transaction';
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('deactivate', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let solidDIDKey: PublicKey;
  let payer: Account;

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    solidDIDKey = await SolidTransaction.createSolid(
      connection,
      payer,
      payer.publicKey,
      CLUSTER,
      SolidData.empty()
    );
  }, 60000);

  it('deactivates a DID', async () => {
    const did = 'did:solid:' + CLUSTER + ':' + solidDIDKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      payer: payer.secretKey,
      identifier: did,
    };

    // ensure the DID is currently registered
    await resolve(did);

    // deactivate it
    await deactivate(deactivateRequest);

    // expect the DID no longer to be registered
    return expect(resolve(did)).rejects.toThrow(/No DID found/);
  });
});
