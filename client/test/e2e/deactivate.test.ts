import { resolve, deactivate, DeactivateRequest } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src/lib/solana/solana-util';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Account, Connection, PublicKey } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('deactivate', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let solDIDKey: PublicKey;
  let owner: Account;

  beforeEach(async () => {
    owner = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
    solDIDKey = await SolTransaction.createDID(
      connection,
      owner,
      owner.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.empty()
    );
  }, 60000);

  it('deactivates a DID', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + solDIDKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      payer: owner.secretKey,
      identifier: did,
    };

    // ensure the DID is currently registered
    await resolve(did);

    // deactivate it
    await deactivate(deactivateRequest);

    // expect the DID no longer to be registered
    return expect(resolve(did)).rejects.toThrow(/No DID found/);
  });

  it('deactivates a DID with a different payer', async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const did = 'did:sol:' + CLUSTER + ':' + solDIDKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      owner: owner.secretKey,
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
