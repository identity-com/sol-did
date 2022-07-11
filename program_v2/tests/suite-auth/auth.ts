import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { PublicKey } from '@solana/web3.js';

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { expect } from "chai";

import { DEFAULT_SEED_STRING, INITIAL_ACCOUNT_SIZE } from "../utils/const";
import { findProgramAddress } from "../utils/utils";
import { before } from "mocha";


chai.use(chaiAsPromised);

describe("sol-did alloc operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  let didData, didDataPDABump;

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(authority.publicKey);
  })


  it("can add a Key to an account", async () => {
    // Add your test here.
    const newKey = anchor.web3.Keypair.generate();

    const tx = await program.methods.addVerificationMethod({
      alias: "new-key",
      keyData: newKey.publicKey.toBytes(),
      method: 0,
      flags: 0,
    }).accounts({
      didData,
      authority: authority.publicKey
    }).rpc();
    console.log("Your transaction signature", tx);

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.verificationMethods.length).to.equal(1)
    expect(didDataAccount.verificationMethods[0].alias).to.equal("new-key")
    expect(didDataAccount.verificationMethods[0].keyData).to.deep.equal(newKey.publicKey.toBytes())
    expect(didDataAccount.verificationMethods[0].method).to.deep.equal( { ed25519VerificationKey2018: {} })
    expect(didDataAccount.verificationMethods[0].flags).to.equal(0)
  });
});
