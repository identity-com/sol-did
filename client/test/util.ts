import { Account } from '@solana/web3.js';
import { ServiceEndpoint } from 'did-resolver';
import { DistributedId, SolidPublicKey } from '../src/lib/solana/solid-data';
import { CLUSTER } from './constants';

export const makeService = (owner: Account): ServiceEndpoint => {
  const identifier = new DistributedId({
    clusterType: CLUSTER,
    pubkey: SolidPublicKey.fromPublicKey(owner.publicKey),
    identifier: '',
  }).toString();

  return {
    description: 'Messaging Service',
    id: `${identifier}#service1`,
    serviceEndpoint: `https://dummmy.dummy/${identifier}`,
    type: 'Messaging',
  };
};
