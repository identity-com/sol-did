import {
  cryptoLDToPublicKeyBase58,
  publicKeyBase58ToCryptoLD,
} from '../src/util';
import { Account } from '@solana/web3.js';
import { expect } from 'chai';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';

describe('util', () => {
  context('publicKeyBase58ToCryptoLD', () => {
    it('creates a key', async () => {
      const solanaKey = new Account().publicKey;
      const cryptoLDKey = await publicKeyBase58ToCryptoLD(solanaKey.toBase58());
      const convertedKey = cryptoLDToPublicKeyBase58(
        Ed25519VerificationKey2020.fromFingerprint({
          fingerprint: cryptoLDKey.fingerprint(),
        })
      );

      expect(convertedKey).to.equal(solanaKey.toBase58());
    });
  });
});
