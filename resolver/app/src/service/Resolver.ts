//import { DID } from '@solana/did'
import { DIDDocument } from 'did-resolver';

const DID = {
  get: async (id: string): Promise<DIDDocument> => ({
    '@context': 'https://w3id.org/did/v1',
    id,
    publicKey: [],
  }),
};

export const resolve = async (did: string): Promise<DIDDocument | undefined> =>
  DID.get(did);
