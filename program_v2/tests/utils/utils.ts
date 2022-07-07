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