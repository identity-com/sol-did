//import { DID } from '@solana/did'
import { DIDDocument } from 'did-resolver';

const DID = {
  create: async (didDocument: DIDDocument): Promise<DIDDocument> => didDocument,
};

export const register = async (
  didDocument: DIDDocument
): Promise<DIDDocument> => DID.create(didDocument);
