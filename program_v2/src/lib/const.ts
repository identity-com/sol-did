import { web3 } from "@project-serum/anchor";
import { Commitment } from "@solana/web3.js";
import { DidAccountSizeHelper } from "../DidAccountSizeHelper";

export const W3ID_CONTEXT = 'https://w3id.org/did/v1.0';
export const getSolContextPrefix = (version: number) => `https://w3id.org/sol/v${version}`;
export const DID_SOL_PREFIX = 'did:sol:'
export const DEFAULT_KEY_ID = 'default';

// export const INITIAL_MIN_ACCOUNT_SIZE = 8 + 50 + 26; // anchor + initial_vm + rest
export const INITIAL_MIN_ACCOUNT_SIZE = DidAccountSizeHelper.getTotalInitialNativeAccountSize();
//export const INITIAL_DEFAULT_ACCOUNT_SIZE = 10_000;
export const DEFAULT_SEED_STRING = "did-account";

export const VALID_DID_REGEX = /^did:([a-z\d:]*):([a-zA-z\d]+)$/

export const SOLANA_MAINNET = 'mainnet-beta';

export const SOLANA_COMMITMENT: Commitment = "confirmed";

export const DID_SOL_PROGRAM = new web3.PublicKey(
  "didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc"
);