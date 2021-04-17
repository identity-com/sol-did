import { accountAndClusterToDID, keyToIdentifier } from '../../../src/lib/util';
import { ClusterType } from '../../../src';
import { DecentralizedIdentifier } from '../../../src/lib/solana/sol-data';
import { Account, PublicKey } from '@solana/web3.js';
import {
  TEST_DID_ACCOUNT_PUBLIC_KEY,
  TEST_DID_ACCOUNT_SECRET_KEY,
} from '../../constants';

describe('util', () => {
  describe('extractMethodIdentifierFromDID', () => {
    it('should extract the method identifier from a DID', () => {
      expect(
        DecentralizedIdentifier.parse(
          'did:sol:Bm8bvjnBCJj6nKExmZk17khkRRNXAvcv2npKbhaqNWGC'
        ).pubkey.toString()
      ).toEqual('Bm8bvjnBCJj6nKExmZk17khkRRNXAvcv2npKbhaqNWGC');
    });
  });

  describe('accountAndClusterToDID', () => {
    const account = new Account(TEST_DID_ACCOUNT_SECRET_KEY);

    it('adds a prefix to localnet DIDs', () => {
      expect(
        accountAndClusterToDID(account, ClusterType.development())
      ).toEqual(`did:sol:localnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`);
    });

    it('adds a prefix to devnet DIDs', () => {
      expect(accountAndClusterToDID(account, ClusterType.devnet())).toEqual(
        `did:sol:devnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`
      );
    });

    it('does not add a prefix to mainnet DIDs', () => {
      expect(
        accountAndClusterToDID(account, ClusterType.mainnetBeta())
      ).toEqual(`did:sol:${TEST_DID_ACCOUNT_PUBLIC_KEY}`);
    });
  });

  describe('keyToIdentifier', () => {
    it('should generate a consistent DID identifier for a known owner public key', async () => {
      const expected = 'did:sol:Bm8bvjnBCJj6nKExmZk17khkRRNXAvcv2npKbhaqNWGC';
      const identifier = await keyToIdentifier(
        new PublicKey(TEST_DID_ACCOUNT_PUBLIC_KEY)
      );
      expect(identifier).toEqual(expected);
    });
  });
});
