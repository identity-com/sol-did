import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { DEFAULT_SEED_STRING } from "./const";
import { Program, web3 } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { Service } from "../../src";

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

export const checkConnectionLogs = (connection: web3.Connection) => {
  if (process.env.ENABLE_LOGS)
    connection.onLogs("all", (log) =>
      console.log(log.logs)
    );
}

export const airdrop = async (
  connection: web3.Connection,
  account: web3.PublicKey,
  amount = anchor.web3.LAMPORTS_PER_SOL) => {
  const sigAirdrop = await connection.requestAirdrop(
    account,
    amount
  );
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature: sigAirdrop,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight
  });
}

export const getTestService = (n : number): Service => ({
  id: `test${n}`,
  serviceType: `testType${n}`,
  serviceEndpoint: `testEndpoint${n}`
})