import { AnchorProvider, Program, Provider, web3 } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { utils as ethersUtils } from "ethers/lib/ethers";
import { EthSigner } from "./types";

export const INITIAL_MIN_ACCOUNT_SIZE = 8 + 60;
export const INITIAL_DEFAULT_ACCOUNT_SIZE = 10_000;
export const DEFAULT_SEED_STRING = "did-account";

const DID_SOL_PROGRAM = new web3.PublicKey(
  "didso1Dpqpm4CsiCjzP766BGY89CAdD6ZBL68cRhFPc"
);

export const fetchProgram = async (
  provider: Provider
): Promise<Program<SolDid>> => {
  const idl = await Program.fetchIdl<SolDid>(DID_SOL_PROGRAM, provider);

  if (!idl) throw new Error("Notification IDL could not be found");

  return new Program<SolDid>(idl, DID_SOL_PROGRAM, provider) as Program<SolDid>;
};

export const findProgramAddress = async (authority: PublicKey) =>
  PublicKey.findProgramAddress(
    [anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING), authority.toBuffer()],
    DID_SOL_PROGRAM
  );

export const ethSignPayload = async (
  instruction: TransactionInstruction,
  nonce: anchor.BN,
  signer: EthSigner
) : Promise<TransactionInstruction> => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const nonceBytes = nonce.toBuffer('le', 8);
  const message = Buffer.concat([instruction.data.subarray(8,-1), nonceBytes]);

  const signatureFull = await signer.signMessage(message)
  // add signature to payload
  const signatureBytes = ethersUtils.arrayify(signatureFull);
  const signature = Array.from(signatureBytes.slice(0,-1))
  // // map [0x1b, 0x1c] to [0, 1]
  // https://docs.ethers.io/v4/api-utils.html#signatures
  // @ts-ignore // can never be 0
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
};

export const signAndConfirmTransactionInstruction = async (
  provider: AnchorProvider,
  signer: SolSigner,
  instruction: web3.TransactionInstruction
) => {
  const transaction = new web3.Transaction().add(instruction);

  const latestBlockhash = await provider.connection.getLatestBlockhash();
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.feePayer = signer.publicKey;
  const signedTransaction = await signer.signTransaction(transaction);
  const signature = await provider.connection.sendRawTransaction(
    signedTransaction.serialize()
  );

  await provider.connection.confirmTransaction(signature);
  return signature;
};

export type SolSigner = {
  publicKey: web3.PublicKey;
  signTransaction: (instruction: web3.Transaction) => Promise<web3.Transaction>;
};


