export { DIDDocument } from 'did-resolver';

export { SolanaUtil } from './lib/solana/solana-util';
export { ClusterType, DecentralizedIdentifier } from './lib/solana/sol-data';

export { resize } from './service/resize';
export { resolve } from './service/resolve';
export { register, createRegisterInstruction } from './service/register';
export { update, createUpdateInstruction } from './service/update';

export { deactivate } from './service/deactivate';

export { addKey, createAddKeyInstruction } from './service/addKey';
export { removeKey, createRemoveKeyInstruction } from './service/removeKey';
export {
  addController,
  createAddControllerInstruction,
} from './service/addController';
export {
  removeController,
  createRemoveControllerInstruction,
} from './service/removeController';
export { addService, createAddServiceInstruction } from './service/addService';
export {
  removeService,
  createRemoveServiceInstruction,
} from './service/removeService';

export {
  RegisterRequest,
  DeactivateRequest,
  UpdateRequest,
  MergeBehaviour,
  generateKeypair,
  PrivateKey,
  PublicKeyBase58,
  keyToIdentifier,
  createRegisterOrUpdateInstruction,
} from './lib/util';

export * from './lib/solana/instruction';
export * from './lib/solana/sol-data';
