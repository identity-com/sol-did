import { Keypair } from '@solana/web3.js';
import { ServiceEndpoint, VerificationMethod } from 'did-resolver';
import {
  DecentralizedIdentifier,
  SolPublicKey,
  getPDAKeyFromAuthority,
} from '../src/lib/solana/sol-data';
import { CLUSTER } from './constants';

export const makeService = async (owner: Keypair): Promise<ServiceEndpoint> => {
  const pubkey = await getPDAKeyFromAuthority(owner.publicKey);

  const identifier = new DecentralizedIdentifier({
    clusterType: CLUSTER,
    authorityPubkey: SolPublicKey.fromPublicKey(owner.publicKey),
    pdaPubkey: SolPublicKey.fromPublicKey(pubkey),
  }).toString();

  return {
    description: 'Messaging Service',
    id: `${identifier}#service1`,
    serviceEndpoint: `https://dummmy.dummy/${identifier}`,
    type: 'Messaging',
  };
};

export const makeVerificationMethod = async (
  owner: Keypair
): Promise<VerificationMethod> => {
  const pubkey = await getPDAKeyFromAuthority(owner.publicKey);

  const identifier = new DecentralizedIdentifier({
    clusterType: CLUSTER,
    authorityPubkey: SolPublicKey.fromPublicKey(pubkey),
    pdaPubkey: SolPublicKey.fromPublicKey(pubkey),
  }).toString();

  const newKey = Keypair.generate().publicKey.toBase58();

  return {
    id: `${identifier}#key2`,
    publicKeyBase58: newKey,
    type: 'Ed25519VerificationKey2018',
    controller: identifier,
  };
};
