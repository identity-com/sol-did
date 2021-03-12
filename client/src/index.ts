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
} from './lib/util';
