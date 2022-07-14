import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { DEFAULT_SEED_STRING } from "./const";
import { AnchorProvider, Program, web3 } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { utils as ethersUtils, Signer, Wallet } from "ethers";
import { keccak256 } from "@ethersproject/keccak256";
import { concat } from "@ethersproject/bytes";
import { toUtf8Bytes } from "@ethersproject/strings";

export const messagePrefix = "\x19Ethereum Signed Message:\n";

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
export const ethSignPayload = async (instruction: TransactionInstruction, nonce: anchor.BN, signer: Wallet) => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const nonceBytes = nonce.toBuffer('le', 8);
  const message = Buffer.concat([instruction.data.subarray(8,-1), nonceBytes]);

  const signatureFull = await signer.signMessage(message)
  // add signature to payload
  const signatureBytes = ethersUtils.arrayify(signatureFull);
  const signature = Array.from(signatureBytes.slice(0,-1))
  // // map [0x1b, 0x1c] to [0, 1]
  // https://docs.ethers.io/v4/api-utils.html#signatures
  const recoveryId = signatureBytes.at(-1) - 27;

  // const rawMessage = concat([
  //   toUtf8Bytes(messagePrefix),
  //   toUtf8Bytes(String(message.length)),
  //   message
  // ])
  // const hash = ethersUtils.hashMessage(message);
  // console.log(`rawMessage: ${ethersUtils.hexlify(rawMessage)} length: ${rawMessage.length}`)
  // console.log(`message: ${ethersUtils.hexlify(message)} length: ${message.length}`)
  // console.log(`hash: ${ethersUtils.hexlify(hash)} hash: ${hash.length}`)
  // console.log(`signature: ${ethersUtils.hexlify(signature)} length: ${signature.length}`)
  // console.log(`recoveryId: ${ethersUtils.hexlify(recoveryId)}`)
  // console.log("Eth Address: ", ethersUtils.arrayify(signer.address))
  // console.log("Eth Address (full): ", ethersUtils.arrayify(signer.publicKey))
  // const recPubKey = ethersUtils.verifyMessage(message, signature)
  // console.log("Recovered Eth Address (full): ", ethersUtils.arrayify(recPubKey))

  // update data & return instruction
  instruction.data = Buffer.concat([
    instruction.data.slice(0, -1), // Remove Option<T> == None
    new Uint8Array([1]), // Add Option<T> == Some
    new Uint8Array(signature),
    new Uint8Array([recoveryId])
  ])
  // return { signature, recoveryId };

  return instruction
}

export const checkConnectionLogs = (connection: web3.Connection) => {
  if (process.env.ENABLE_LOGS)
    connection.onLogs("all", (log) =>
      console.log(log.logs)
    );
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