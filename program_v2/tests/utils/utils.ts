import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { DEFAULT_SEED_STRING } from "./const";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { utils as ethersUtils, Signer } from "ethers";

const program = anchor.workspace.SolDid as Program<SolDid>;

export const findProgramAddress = async (authority: PublicKey) => PublicKey
  .findProgramAddress(
    [
      anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING),
      authority.toBuffer()
    ],
    program.programId
  );

// This message expects an ethereum-capable did:sol instruction and will return the expected signature payload.
export const ethSignPayload = async (instruction: TransactionInstruction, signer: Signer) => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const message = instruction.data.subarray(8,-1)

  const signatureFull = await signer.signMessage(message)
  // add signature to payload
  const signatureBytes = ethersUtils.arrayify(signatureFull);
  const signature = Array.from(signatureBytes.slice(0,-1))
  // // map [0x1b, 0x1c] to [0, 1]
  // https://docs.ethers.io/v4/api-utils.html#signatures
  const recoveryId = signatureBytes.at(-1) - 27;

  // update data & return instruction
  instruction.data = Buffer.concat([
    instruction.data.slice(0, -1), // Remove Option<T> == None
    new Uint8Array([1]), // Add Option<T> == Some
    new Uint8Array(signature),
    new Uint8Array([recoveryId])
  ])

  return instruction
}

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

export enum VerificationMethodType {
  // The main Ed25519Verification Method.
  // https://w3c-ccg.github.io/lds-ed25519-2018/
  Ed25519VerificationKey2018,
  // Verification Method for For 20-bytes Ethereum Keys
  EcdsaSecp256k1RecoveryMethod2020,
  // Verification Method for a full 32 bytes Secp256k1 Verification Key
  EcdsaSecp256k1VerificationKey2019,
}