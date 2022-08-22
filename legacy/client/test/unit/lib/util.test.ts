import { keypairAndClusterToDID, keyToIdentifier } from '../../../src/lib/util';
import { ClusterType } from '../../../src';
import { DecentralizedIdentifier } from '../../../src';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  TEST_DID_ACCOUNT_PUBLIC_KEY,
  TEST_DID_ACCOUNT_SECRET_KEY,
} from '../../constants';

describe('util', () => {
  describe('extractMethodIdentifierFromDID', () => {
    it('should extract the method identifier from a DID', async () => {
      const did = DecentralizedIdentifier.parse(
        'did:sol:Bm8bvjnBCJj6nKExmZk17khkRRNXAvcv2npKbhaqNWGC'
      );
      console.log(did);
      expect(did.authorityPubkey.toString()).toEqual(
        'Bm8bvjnBCJj6nKExmZk17khkRRNXAvcv2npKbhaqNWGC'
      );
    });
  });

  describe('accountAndClusterToDID', () => {
    const account = Keypair.fromSecretKey(
      Buffer.from(TEST_DID_ACCOUNT_SECRET_KEY)
    );

    it('adds a prefix to localnet DIDs', async () => {
      expect(
        await keypairAndClusterToDID(account, ClusterType.development())
      ).toEqual(`did:sol:localnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`);
    });

    it('adds a prefix to devnet DIDs', async () => {
      expect(
        await keypairAndClusterToDID(account, ClusterType.devnet())
      ).toEqual(`did:sol:devnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`);
    });

    it('does not add a prefix to mainnet DIDs', async () => {
      expect(
        await keypairAndClusterToDID(account, ClusterType.mainnetBeta())
      ).toEqual(`did:sol:${TEST_DID_ACCOUNT_PUBLIC_KEY}`);
    });
  });

  describe('keyToIdentifier', () => {
    it('should generate a consistent DID identifier for a known owner public key', async () => {
      const identifier = await keyToIdentifier(
        new PublicKey(TEST_DID_ACCOUNT_PUBLIC_KEY)
      );
      expect(identifier).toEqual('did:sol:' + TEST_DID_ACCOUNT_PUBLIC_KEY);
    });
  });
});
