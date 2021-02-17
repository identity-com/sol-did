//import { DID } from '@solana/did'
const DID = { get: (id: string) => ({ todo: id }) };

export const resolve = async (did: string): Promise<object | undefined> =>
  DID.get(did);
