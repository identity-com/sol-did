import { DIDs } from '../src';
import { ClusterType, SolanaUtil } from '@identity.com/solid-did-client';
import { Account, Connection } from '@solana/web3.js';
import { expect } from 'chai';
import { DIDDocument } from 'did-resolver';

const cluster = ClusterType.devnet();

function getKeyForCapabilityInvocation(document: DIDDocument) {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  expect(document.capabilityInvocation).to.exist.and.not.to.be.empty;
  const capabilityInvocationElement =
    document.capabilityInvocation && document.capabilityInvocation[0];
  return document.verificationMethod?.find(
    verificationMethod => verificationMethod.id === capabilityInvocationElement
  );
}

describe('DIDs', () => {
  let dids: DIDs;
  let owner;

  before('Set up a payer account on Solana devnet', async function() {
    this.timeout(10000);
    const connection = new Connection(cluster.solanaUrl(), 'recent');
    const payerAccount = await SolanaUtil.newAccountWithLamports(
      connection,
      10000000
    );

    dids = new DIDs({ payer: payerAccount.secretKey, cluster: 'devnet' });
  });

  beforeEach(() => {
    owner = new Account().publicKey;
  });

  context('did-key', () => {
    it('should create a did-key DID from a Solana public key', async () => {
      const did = await dids.register('key', owner);

      expect(did).to.match(/^did:key:/);
    });

    it('should contain the solana public key as the capabilityInvocation key in a did-key DID', async () => {
      const did = await dids.register('key', owner);

      const document = await dids.get(did);

      const matchingVerificationMethod = getKeyForCapabilityInvocation(
        document
      );

      expect(matchingVerificationMethod?.publicKeyBase58).to.equal(
        owner.toBase58()
      );
    });
  });

  // Skippd until new versions of the DID program can be deployed to devnet
  context.skip('did-solid', () => {
    it('should create a did-solid DID from a Solana public key', async () => {
      const did = await dids.register('solid', owner);

      expect(did).to.match(/^did:solid:/);
    });

    it('should contain the solana public key as the capabilityInvocation key in a did-solid DID', async () => {
      const did = await dids.register('solid', owner);

      const document = await dids.get(did);

      const matchingVerificationMethod = getKeyForCapabilityInvocation(
        document
      );

      expect(matchingVerificationMethod?.publicKeyBase58).to.equal(
        owner.toBase58()
      );
    });
  });
});
