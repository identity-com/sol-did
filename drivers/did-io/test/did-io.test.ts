import { CachedResolver } from '@digitalbazaar/did-io';
import didKey from '@digitalbazaar/did-method-key';
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

    resolver.use(didKey.driver());
    resolver.use(didSol.driver({ payer: payerAccount.secretKey }));
  }, 60000);

  it('generates a did on devnet', async () => {
    const { didDocument, keyPairs, methodFor } = await resolver.generate({
      method: 'sol',
      cluster: cluster.toString(),
    });

    const verificationMethod = methodFor({ purpose: 'verificationMethod' });
    const keypair = keyPairs.get(verificationMethod.id);

    const document = await resolver.get({ did: didDocument.id });

    expect(document).toEqual(didDocument);
    expect(document.verificationMethod[0].publicKeyBase58).toEqual(
      keypair.publicKeyBase58
    );
    expect(document.verificationMethod[0].publicKeyBase58).toEqual(
      verificationMethod.publicKeyBase58
    );
  }, 60000);
});
