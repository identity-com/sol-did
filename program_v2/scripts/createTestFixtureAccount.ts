import { DidSolService } from "../dist/src";
import { Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { SolDid } from "../dist/target/types/sol_did";
import { findProgramAddress, INITIAL_MIN_ACCOUNT_SIZE } from "../src/lib/utils";
import { Transaction } from "@solana/web3.js";
import { airdrop } from "../tests/utils/utils";

const { exec } = require("child_process");

(async () => {
  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const [didData, _] = await findProgramAddress(authority.publicKey);

  await airdrop(programProvider.connection, authority.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);

  const service = new DidSolService(
    program,
    authority.publicKey,
    didData,
    programProvider
  );

  console.log("DidIdentifier: " + authority.publicKey.toBase58());
  console.log("DidDataAccount: " + didData.toBase58());


  // Init account
  const init = await service.initialize(INITIAL_MIN_ACCOUNT_SIZE);
  const initTx = new Transaction().add(init);
  await programProvider.sendAndConfirm(initTx)

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-min.json --output json`);

  const DEFAULT_ACCOUNT_SIZE = 10_000;

  const instruction = await service.resize(DEFAULT_ACCOUNT_SIZE, authority.publicKey);
  const tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)

  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account.json --output json`);


  // const [_, derivedPass] = await service.derivePass([constituentPass], {
  //   expireOnUse: true,
  //   expireDuration: 365 * 24 * 60 * 60, // expires in 1 year - an expireOnUse token must have some expiry time already set
  //   refreshDisabled: true,
  // });
  //
  // console.log("Authority: " + provider.wallet.publicKey.toBase58());
  // console.log("DidDoc: " + JSON.stringify(didDoc, null, 2));
})().catch(console.error);
