import {CachedResolver} from '@digitalbazaar/did-io';
import didSol from '../src/';
import { Connection } from '@solana/web3.js';
import { ClusterType, SolanaUtil } from '@identity.com/sol-did-client';

const cluster = ClusterType.devnet();
const resolver = new CachedResolver();

// Creates a DID on Solana Devnet
describe('did-io integration', () => {
  beforeAll(async () => {
    const connection = new Connection(cluster.solanaUrl(), 'recent');
    const payerAccount = await SolanaUtil.newAccountWithLamports(
      connection,
      10000000
    );

    resolver.use(didSol.driver({ payer: payerAccount.secretKey }));
  }, 60000);

  it('generates a did on devnet', async () => {
    const { didDocument } = await resolver.generate({
      method: 'sol',
      cluster: cluster.toString(),
    });

    const document = await resolver.get({ did: didDocument.id });

    expect(document).toEqual(didDocument);
    // expect(document.verificationMethod[0].publicKeyBase58).toEqual(
    //   owner.publicKey.toBase58()
    // );
  }, 60000);
});
