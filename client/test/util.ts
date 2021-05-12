import { Account } from '@solana/web3.js';
import { ServiceEndpoint, VerificationMethod } from 'did-resolver';
import {
  DecentralizedIdentifier,
  SolPublicKey,
} from '../src/lib/solana/sol-data';
import { CLUSTER } from './constants';
import { getKeyFromAuthority } from '../src/lib/solana/instruction';

export const makeService = async (owner: Account): Promise<ServiceEndpoint> => {
  const pubkey = await getKeyFromAuthority(owner.publicKey);

  const identifier = new DecentralizedIdentifier({
    clusterType: CLUSTER,
    pubkey: SolPublicKey.fromPublicKey(pubkey),
  }).toString();

  return {
    description: 'Messaging Service',
    id: `${identifier}#service1`,
    serviceEndpoint: `https://dummmy.dummy/${identifier}`,
    type: 'Messaging',
  };
};

export const makeVerificationMethod = async (
  owner: Account
): Promise<VerificationMethod> => {
  const pubkey = await getKeyFromAuthority(owner.publicKey);

  const identifier = new DecentralizedIdentifier({
    clusterType: CLUSTER,
    pubkey: SolPublicKey.fromPublicKey(pubkey),
  }).toString();

  const newKey = new Account().publicKey.toBase58();

  return {
    id: `${identifier}#key2`,
    publicKeyBase58: newKey,
    type: 'Ed25519VerificationKey2018',
    controller: identifier,
  };
};
