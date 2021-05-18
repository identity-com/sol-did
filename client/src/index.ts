export { DIDDocument } from 'did-resolver';

export { SolanaUtil } from './lib/solana/solana-util';
export { ClusterType, DecentralizedIdentifier } from './lib/solana/sol-data';

export { resolve } from './service/resolve';
export { register, createRegisterInstruction } from './service/register';
export { update, createUpdateInstruction } from './service/update';
export { deactivate } from './service/deactivate';

export {
  RegisterRequest,
  DeactivateRequest,
  UpdateRequest,
  MergeBehaviour,
  generateKeypair,
  PrivateKey,
  PublicKeyBase58,
  keyToIdentifier,
} from './lib/util';
