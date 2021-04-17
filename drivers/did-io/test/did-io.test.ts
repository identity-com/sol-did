import didIo from 'did-io';
import didKey from 'did-method-key';
import didSol from '../src/';
import { Account, Connection } from '@solana/web3.js';
import { ClusterType, SolanaUtil } from '@identity.com/sol-did-client';

const cluster = ClusterType.devnet();

// Creates a DID on Solana Devnet
// Skipped until the changes to the program are pushed to Devnet
describe('did-io integration', () => {
  beforeAll(async () => {
    const connection = new Connection(cluster.solanaUrl(), 'recent');
    const payerAccount = await SolanaUtil.newAccountWithLamports(
      connection,
      10000000
    );

    didIo.use('key', didKey.driver());
    didIo.use('sol', didSol.driver({ payer: payerAccount.secretKey }));
  }, 60000);

  it('creates a did on devnet', async () => {
    const owner = new Account();

    const did = await didIo.register({
      key: owner.publicKey.toBase58(),
      didDocument: { did: 'did:sol:' },
      cluster: cluster.toString(),
    });

    const document = await didIo.get({ did });

    expect(document.id).toEqual(did);
    expect(document.verificationMethod[0].publicKeyBase58).toEqual(
      owner.publicKey.toBase58()
    );
  }, 60000);
});
