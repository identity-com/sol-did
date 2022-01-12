import { CachedResolver } from '@digitalbazaar/did-io';
import didKey from '@digitalbazaar/did-method-key';
import didSol, { Driver } from '../src/';
import { Connection, Keypair } from '@solana/web3.js';
import { ClusterType, SolanaUtil } from '@identity.com/sol-did-client';

const cluster = ClusterType.devnet();
const resolver = new CachedResolver();

const generateKey = () => {
  const keyPair = Keypair.generate();
  const did = `did:sol:devnet:${keyPair.publicKey.toBase58()}`;
  const methodId = `${did}#default`;

  return { keyPair, did, methodId };
}

// Creates a DID on Solana Devnet
describe('did-io integration', () => {
  let didSolDriver: Driver;

  beforeAll(async () => {
    const connection = new Connection(cluster.solanaUrl(), 'recent');
    const payerAccount = await SolanaUtil.newAccountWithLamports(
      connection,
      10000000
    );

    didSolDriver = didSol.driver({ payer: payerAccount.secretKey });

    resolver.use(didKey.driver());
    resolver.use(didSolDriver);
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
    const { keyPair, did, methodId } = generateKey();

    const vm = await resolver.get({ url: methodId });

    expect(vm).toEqual({
      id: methodId,
      type: 'Ed25519VerificationKey2018',
      controller: did,
      publicKeyBase58: keyPair.publicKey.toBase58(),
    });
  }, 60000);

  it('finds the finds the verification method for a did', async () => {
    const { did, methodId, keyPair } = generateKey();

    const didDocument = await resolver.get({ did });

    const vm = didSolDriver.publicMethodFor({ didDocument, purpose: 'verificationMethod' });

    expect(vm).toEqual({
      id: methodId,
      type: 'Ed25519VerificationKey2018',
      controller: did,
      publicKeyBase58: keyPair.publicKey.toBase58(),
    });
  });
});
