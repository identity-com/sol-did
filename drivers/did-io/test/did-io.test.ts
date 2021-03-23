import didIo from 'did-io';
import didKey from 'did-method-key';
import didSolid from '../src/';
import { Account, Connection } from '@solana/web3.js';
import { ClusterType, SolanaUtil } from '@identity.com/solid-did-client';

const cluster = ClusterType.devnet();

describe('did-io integration', () => {
  beforeAll(async () => {
    const connection = new Connection(cluster.solanaUrl(), 'recent');
    const payerAccount = await SolanaUtil.newAccountWithLamports(
      connection,
      10000000
    );

    didIo.use('key', didKey.driver());
    didIo.use('solid', didSolid.driver({ payer: payerAccount.secretKey }));
  });

  it('creates a did on devnet', async () => {
    const owner = new Account();

    const did = await didIo.register({
      key: owner.publicKey.toBase58(),
      didDocument: { did: 'did:solid:' },
      cluster: cluster.toString(),
    });

    const document = await didIo.get({ did });

    expect(document.id).toEqual(did);
    expect(document.verificationMethod[0].publicKeyBase58).toEqual(
      owner.publicKey.toBase58()
    );
  });
});
