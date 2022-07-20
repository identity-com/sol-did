import { DidSolUpdateArgs } from './types';
import { SolData } from '@identity.com/sol-did-client-legacy';

export const mapLegacyToUpdateArg = (legacyData: SolData): DidSolUpdateArgs => {
  return {
    nativeControllers: [],
    otherControllers: [],
    services: [],
    verificationMethods: [],
  };
};
