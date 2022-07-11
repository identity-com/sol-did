import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { DEFAULT_SEED_STRING } from "./const";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

const program = anchor.workspace.SolDid as Program<SolDid>;

export const findProgramAddress = async (authority: PublicKey) => PublicKey
  .findProgramAddress(
    [
      anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING),
      authority.toBuffer()
    ],
    program.programId
  );

export enum VerificationMethodFlags {
  None = 0,
  Authentication = 1 << 0,
  Assertion = 1 << 1,
  KeyAgreement = 1 << 2,
  CapabilityInvocation = 1 << 3,
  CapabilityDelegation = 1 << 4,
  DidDocHidden = 1 << 5,
  OwnershipProof = 1 << 6,
  All = Authentication | Assertion | KeyAgreement | CapabilityInvocation | CapabilityDelegation | DidDocHidden | OwnershipProof
}