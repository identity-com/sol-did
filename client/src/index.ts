export { SolanaUtil } from './lib/solana/solana-util';
export { ClusterType } from './lib/solana/solid-data';

export { resolve } from './service/resolve';
export { register } from './service/register';
export { update } from './service/update';
export { deactivate } from './service/deactivate';

export {
  RegisterRequest,
  DeactivateRequest,
  UpdateRequest,
  MergeBehaviour,
  generateKeypair,
  PrivateKey,
  PublicKeyBase58,
} from './lib/util';
