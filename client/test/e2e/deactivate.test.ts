import { resolve, deactivate, DeactivateRequest } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('deactivate', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let didAddress: Keypair;

  beforeEach(async () => {
    didAddress = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    await SolTransaction.createDID(
      connection,
      didAddress,
      didAddress.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.empty()
    );
  }, 60000);

  it('deactivates a DID', async () => {
    const did = 'did:sol:' + CLUSTER + ':' + didAddress.publicKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      payer: didAddress.secretKey,
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
    const did = 'did:sol:' + CLUSTER + ':' + didAddress.publicKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      owner: didAddress.secretKey,
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
