import { CLUSTER } from '../constants';
import { register, RegisterRequest, resolve, SolanaUtil } from '../../src';
import { Connection, Keypair } from '@solana/web3.js';
import { addService, removeService } from '../../dist';
import { ServiceEndpoint } from 'did-resolver';

const alias = 'dummy';
const dummyService = (did: string): ServiceEndpoint => ({
  id: `${did}#${alias}`,
  type: alias,
  serviceEndpoint: alias,
  description: alias,
});

describe('service', () => {
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
    it('should add a service to a registered did', async () => {
      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const identifier = await register(registerRequest);

      const service = dummyService(identifier);

      await addService({
        identifier,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      const document = await resolve(identifier);

      expect(document.service).toContainEqual(service);
    });

    it('should add a service to an unregistered did', async () => {
      const identifier = `did:sol:localnet:${owner.publicKey.toBase58()}`;

      const service = dummyService(identifier);

      await addService({
        identifier,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      const document = await resolve(identifier);

      expect(document.service).toContainEqual(service);
    });
  });

  describe('remove', () => {
    it('should remove a service', async () => {
      const identifier = `did:sol:localnet:${owner.publicKey.toBase58()}`;

      const service = dummyService(identifier);

      await addService({
        identifier,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      let document = await resolve(identifier);
      expect(document.service).toContainEqual(service);

      await removeService({
        identifier,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        alias,
      });

      document = await resolve(identifier);
      expect(document.service).not.toContainEqual(service);
    });
  });
});
