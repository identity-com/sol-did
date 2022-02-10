import { CLUSTER, VALIDATOR_URL } from '../constants';
import {
  register,
  RegisterRequest,
  resolve,
  SolanaUtil,
  addKey,
  removeKey,
} from '../../src';
import { Connection, Keypair } from '@solana/web3.js';

describe('key', () => {
  const connection = new Connection(VALIDATOR_URL, 'recent');
  let payer: Keypair;
  let owner: Keypair;

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
  }, 60000);

  beforeEach(() => {
    owner = Keypair.generate();
  });

  describe('add', () => {
    it('should add a key to a registered did', async () => {
      const key = Keypair.generate().publicKey.toBase58();

      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const did = await register(registerRequest);

      await addKey({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        fragment: 'key2',
        key,
      });

      const document = await resolve(did);

      expect(document.capabilityInvocation).toContain(`${did}#key2`);
    });

    it('should add a key to an unregistered did', async () => {
      const key = Keypair.generate().publicKey.toBase58();

      const did = `did:sol:localnet:${owner.publicKey.toBase58()}`;

      await addKey({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        fragment: 'key2',
        key,
      });

      const document = await resolve(did);
      expect(document.capabilityInvocation).toContain(`${did}#key2`);
    });
  });

  describe('remove', () => {
    it('should remove the default key', async () => {
      const key = Keypair.generate().publicKey.toBase58();

      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const did = await register(registerRequest);

      await addKey({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        fragment: 'key2',
        key,
      });

      await removeKey({
        fragment: 'default',
        owner: owner.secretKey,
        payer: payer.secretKey,
        did,
        connection,
      });

      const document = await resolve(did);

      // Check that the second key has been added
      expect(document.capabilityInvocation).toContain(`${did}#key2`);
      // Check that the default key has been removed from the capabilityInvocation
      expect(document.capabilityInvocation).not.toContain(`${did}#default`);

      // Ensure the default key is still on the did
      expect(document.verificationMethod).toContainEqual(
        expect.objectContaining({
          id: `${did}#default`,
        })
      );
    });

    it('should remove a second key', async () => {
      const key = Keypair.generate().publicKey.toBase58();

      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const did = await register(registerRequest);

      await addKey({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        fragment: 'key2',
        key,
      });

      await removeKey({
        fragment: 'key2',
        owner: owner.secretKey,
        payer: payer.secretKey,
        did,
        connection,
      });

      const document = await resolve(did);

      expect(document.capabilityInvocation).toContain(`${did}#default`);
      expect(document.capabilityInvocation).not.toContain(`${did}#key2`);

      expect(document.verificationMethod).not.toContainEqual(
        expect.objectContaining({
          id: `${did}#key2`,
        })
      );
    });
  });
});
