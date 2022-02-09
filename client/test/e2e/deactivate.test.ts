import { resolve, deactivate, DeactivateRequest } from '../../src';
import { DEFAULT_DOCUMENT_SIZE } from '../../src/lib/constants';
import { getPDAKeyFromAuthority, SolData } from '../../src/lib/solana/sol-data';
import { SolanaUtil } from '../../src';
import { SolTransaction } from '../../src/lib/solana/transaction';
import { Keypair, Connection } from '@solana/web3.js';
import { CLUSTER, VALIDATOR_URL } from '../constants';

describe('deactivate', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let didAuthorityAddress: Keypair;

  beforeEach(async () => {
    didAuthorityAddress = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    await SolTransaction.createDID(
      connection,
      didAuthorityAddress,
      didAuthorityAddress.publicKey,
      DEFAULT_DOCUMENT_SIZE,
      SolData.sparse(
        await getPDAKeyFromAuthority(didAuthorityAddress.publicKey),
        didAuthorityAddress.publicKey,
        CLUSTER
      )
    );
  }, 60000);

  it('deactivates a DID', async () => {
    const did =
      'did:sol:' + CLUSTER + ':' + didAuthorityAddress.publicKey.toBase58();
    const deactivateRequest: DeactivateRequest = {
      payer: didAuthorityAddress.secretKey,
      did: did,
    };

    // ensure the DID is currently registered
    await resolve(did);

    // deactivate it
    await deactivate(deactivateRequest);

    // expect the DID no longer to be registered
    return expect(await resolve(did)).toEqual(
      SolData.sparse(
        await getPDAKeyFromAuthority(didAuthorityAddress.publicKey),
        didAuthorityAddress.publicKey,
        CLUSTER
      ).toDIDDocument()
    );
  });

  it('deactivates a DID with a different payer', async () => {
    const payer = await SolanaUtil.newAccountWithLamports(
      connection,
      1000000000
    );
    const did =
      'did:sol:' + CLUSTER + ':' + didAuthorityAddress.publicKey.toBase58();

    const deactivateRequest: DeactivateRequest = {
      owner: didAuthorityAddress.secretKey,
      payer: payer.secretKey,
      did,
    };

    // ensure the DID is currently registered
    await resolve(did);

    // deactivate it
    await deactivate(deactivateRequest);

    // expect the DID no longer to be registered
    return expect(await resolve(did)).toEqual(
      SolData.sparse(
        await getPDAKeyFromAuthority(didAuthorityAddress.publicKey),
        didAuthorityAddress.publicKey,
        CLUSTER
      ).toDIDDocument()
    );
  });
});
