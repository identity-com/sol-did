import { Program, Provider, web3 } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Signer, Wallet } from "ethers";
import { utils as ethersUtils } from "ethers/lib/ethers";

export const INITIAL_ACCOUNT_SIZE = 8 + 60;
export const DEFAULT_SEED_STRING = "did-account";

const DID_SOL_PROGRAM = new web3.PublicKey(
  "didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc"
);

export const fetchProgram = async (
  provider: Provider
): Promise<Program<SolDid>> => {
  const idl = await Program.fetchIdl<SolDid>(
    DID_SOL_PROGRAM,
    provider
  );

  if (!idl) throw new Error("Notification IDL could not be found");

  return new Program<SolDid>(
    idl,
    DID_SOL_PROGRAM,
    provider
  ) as Program<SolDid>;
};

export const findProgramAddress = async (authority: PublicKey) => PublicKey
  .findProgramAddress(
    [
      anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING),
      authority.toBuffer()
    ],
    DID_SOL_PROGRAM
  );

export const ethSignPayload = async (instruction: TransactionInstruction, nonce: anchor.BN, signer: Signer) => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const nonceBytes = nonce.toBuffer('le', 8);
  const message = Buffer.concat([instruction.data.subarray(8, -1), nonceBytes]);

  // make sure the message has sufficient length

  const signatureFull = await signer.signMessage(message)
  // add signature to payload
  const signatureBytes = ethersUtils.arrayify(signatureFull);
  const signature = Array.from(signatureBytes.slice(0, -1))
  // // map [0x1b, 0x1c] to [0, 1]
  // https://docs.ethers.io/v4/api-utils.html#signatures
  // @ts-ignore signatureBytes always has length > 1;
  const recoveryId = signatureBytes.at(-1) - 27;

  return {
    signature,
    recoveryId
  }
}