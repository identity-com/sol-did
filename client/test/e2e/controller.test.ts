import { register, RegisterRequest, resolve, SolanaUtil } from '../../src';
import { CLUSTER } from '../constants';
import { Connection, Keypair } from '@solana/web3.js';
import { addController, removeController } from '../../dist';

describe('controller', () => {
  const connection = new Connection('http://localhost:8899', 'recent');
  let payer: Keypair;
  let owner: Keypair;

  beforeAll(async () => {
    payer = await SolanaUtil.newAccountWithLamports(connection, 1000000000);
  }, 60000);

  beforeEach(() => {
    owner = Keypair.generate();
  });

  describe('add', () => {
    it('adds a controller to a did', async () => {
      const key = Keypair.generate().publicKey.toBase58();
      const controller = `did:sol:localnet:${key}`;

      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const did = await register(registerRequest);

      await addController({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        controller,
      });

      const document = await resolve(did);

      expect(document.controller).toContain(controller);
    });
  });

  describe('remove', () => {
    it('removes a controller to a did', async () => {
      const key = Keypair.generate().publicKey.toBase58();
      const did = `did:sol:localnet:${owner.publicKey.toBase58()}`;
      const controller = `did:sol:localnet:${key}`;

      await addController({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        controller,
      });
      let document = await resolve(did);
      // confirm that the controller has been registered
      expect(document.controller).toContain(controller);

      await removeController({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        controller,
      });
      document = await resolve(did);
      // check that the controller has been removed
      expect(document.controller).not.toContain(controller);
    });
  });
});
