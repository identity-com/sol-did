import { CLUSTER, VALIDATOR_URL } from '../constants';
import {
  register,
  RegisterRequest,
  resolve,
  SolanaUtil,
  addService,
  removeService,
} from '../../src';
import { Connection, Keypair } from '@solana/web3.js';
import { ServiceEndpoint } from 'did-resolver';

const alias = 'dummy';
const dummyService = (did: string): ServiceEndpoint => ({
  id: `${did}#${alias}`,
  type: alias,
  serviceEndpoint: alias,
  description: alias,
});

describe('service', () => {
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
    it('should add a service to a registered did', async () => {
      const registerRequest: RegisterRequest = {
        payer: payer.secretKey,
        cluster: CLUSTER,
        owner: owner.publicKey.toBase58(),
      };
      const did = await register(registerRequest);

      const service = dummyService(did);

      await addService({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      const document = await resolve(did);

      expect(document.service).toContainEqual(service);
    });

    it('should add a service to an unregistered did', async () => {
      const did = `did:sol:localnet:${owner.publicKey.toBase58()}`;

      const service = dummyService(did);

      await addService({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      const document = await resolve(did);

      expect(document.service).toContainEqual(service);
    });
  });

  describe('remove', () => {
    it('should remove a service', async () => {
      const did = `did:sol:localnet:${owner.publicKey.toBase58()}`;

      const service = dummyService(did);

      await addService({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        service,
      });

      let document = await resolve(did);
      expect(document.service).toContainEqual(service);

      await removeService({
        did,
        connection,
        owner: owner.secretKey,
        payer: payer.secretKey,
        alias,
      });

      document = await resolve(did);
      expect(document.service).not.toContainEqual(service);
    });
  });
});
