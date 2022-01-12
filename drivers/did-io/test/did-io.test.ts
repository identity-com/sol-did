import { CachedResolver } from '@digitalbazaar/did-io';
import didKey from '@digitalbazaar/did-method-key';
import didSol from '../src/';
import { Connection, Keypair } from '@solana/web3.js';
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

    const resolvedDocument = await resolver.get({ did: didDocument.id });

    expect(resolvedDocument).toEqual(didDocument);
    expect(resolvedDocument.verificationMethod[0].publicKeyBase58).toEqual(
      keypair.publicKeyBase58
    );
    expect(resolvedDocument.verificationMethod[0].publicKeyBase58).toEqual(
      verificationMethod.publicKeyBase58
    );
  }, 60000);

  it('resolves a verification method', async () => {
    const kp = Keypair.generate();
    const did = `did:sol:devnet:${kp.publicKey.toBase58()}`;
    const keyId = `${did}#default`;
    const vm = await resolver.get({ url: keyId });

    expect(vm).toEqual({
      id: keyId,
      type: 'Ed25519VerificationKey2018',
      controller: did,
      publicKeyBase58: kp.publicKey.toBase58(),
    });
  }, 60000);
});
