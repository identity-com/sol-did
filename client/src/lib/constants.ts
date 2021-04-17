import { Commitment, PublicKey } from '@solana/web3.js';

export const DID_HEADER = 'did';
export const DID_METHOD = 'sol';
export const PROGRAM_ID: PublicKey = new PublicKey(
  'ide3Y2TubNMLLhiG1kDL6to4a8SjxD18YWCYC5BZqNV'
);
export const SOLANA_COMMITMENT: Commitment = 'confirmed';
export const DEFAULT_DOCUMENT_SIZE = 1_000;

export const W3ID_CONTEXT = 'https://w3id.org/did/v1.0';
export const SOL_CONTEXT_PREFIX = 'https://w3id.org/sol/v';
