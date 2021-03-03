import {
  accountAndClusterToDID,
  extractMethodIdentifierFromDID,
} from '../src/util';
import { Account } from '@solana/web3.js';
import {
  TEST_DID_ACCOUNT_PUBLIC_KEY,
  TEST_DID_ACCOUNT_SECRET_KEY,
} from './e2e/constants';

describe('util', () => {
  describe('extractMethodIdentifierFromDID', () => {
    it('should extract the method identifier from a DID', () => {
      expect(extractMethodIdentifierFromDID('did:solid:abc')).toEqual('abc');
    });
  });

  describe('accountAndClusterToDID', () => {
    const account = new Account(TEST_DID_ACCOUNT_SECRET_KEY);

    it('adds a prefix to localnet DIDs', () => {
      expect(accountAndClusterToDID(account, 'localnet')).toEqual(
        `did:solid:localnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`
      );
    });

    it('adds a prefix to devnet DIDs', () => {
      expect(accountAndClusterToDID(account, 'devnet')).toEqual(
        `did:solid:devnet:${TEST_DID_ACCOUNT_PUBLIC_KEY}`
      );
    });

    it('does not add a prefix to mainnet DIDs', () => {
      expect(accountAndClusterToDID(account, 'mainnet-beta')).toEqual(
        `did:solid:${TEST_DID_ACCOUNT_PUBLIC_KEY}`
      );
    });
  });
});
