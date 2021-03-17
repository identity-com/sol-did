import { Account } from '@solana/web3.js';
import { ServiceEndpoint } from 'did-resolver';
import {
  DecentralizedIdentifier,
  SolidPublicKey,
} from '../src/lib/solana/solid-data';
import { CLUSTER } from './constants';
import { getKeyFromAuthority } from '../src/lib/solana/instruction';

export const makeService = async (owner: Account): Promise<ServiceEndpoint> => {
  const pubkey = await getKeyFromAuthority(owner.publicKey);

  const identifier = new DecentralizedIdentifier({
    clusterType: CLUSTER,
    pubkey: SolidPublicKey.fromPublicKey(pubkey),
  }).toString();

  return {
    description: 'Messaging Service',
    id: `${identifier}#service1`,
    serviceEndpoint: `https://dummmy.dummy/${identifier}`,
    type: 'Messaging',
  };
};
