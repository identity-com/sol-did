import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../target/types/sol_did";
import { PublicKey } from '@solana/web3.js';


import chai from 'chai';
import { expect } from 'chai';

describe("sol-did", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;


  it("Is initialized!", async () => {
    const authority = programProvider.wallet;
    const ACCOUNT_SIZE = 10_000;

    const [didData, didDataPDABump] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );


    const tx = await program.methods.initialize(ACCOUNT_SIZE)
      .accounts({
        didData,
        authority: authority.publicKey
      })
      .rpc();

    // check data
    const didDataAccount = await program.account.didAccount.fetch(didData)
    expect(didDataAccount.version).to.equal(0)
    expect(didDataAccount.bump).to.equal(didDataPDABump)
    expect(didDataAccount.nonce.eq(new anchor.BN(0))).to.be.true;

    expect(didDataAccount.nativeControllers.length).to.equal(0)
    expect(didDataAccount.verificationMethods.length).to.equal(0)
    expect(didDataAccount.initialAuthority.toBase58()).to.equal(authority.publicKey.toBase58())

    expect(didDataAccount.otherControllers.length).to.equal(0)
    const rawDidDataAccount = await programProvider.connection.getAccountInfo(didData)
    expect(rawDidDataAccount.data.length).to.equal(ACCOUNT_SIZE)


    console.log("Your transaction signature", tx);
  });


  it("can add a Key to an account", async () => {
    // Add your test here.
    const newKey = anchor.web3.Keypair.generate();

    const authority = programProvider.wallet;

    const [didData, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );

    const tx = await program.methods.addVerificationMethod({
      alias: "new-key",
      keyData: newKey.publicKey.toBytes(),
      method: 0,
      flags: 0,
    }).accounts({
      didData,
      payer: authority.publicKey
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
