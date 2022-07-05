import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import { SolDid } from "../target/types/sol_did";
import { PublicKey } from '@solana/web3.js';


import chai, { assert } from 'chai';
import { expect } from 'chai';

describe("sol-did", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  //initialize
  it("Is initialized!", async () => {
    const authority = programProvider.wallet;

    const [data, dataPDABump] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );

    
    const tx = await program.methods.initialize()
      .accounts({
        data,
        authority: authority.publicKey
      })
      .rpc();

    // check data
    const didDataAccount = await program.account.didAccount.fetch(data)
    expect(didDataAccount.version).to.equal(0)
    expect(didDataAccount.bump).to.equal(dataPDABump)
    expect(didDataAccount.nativeControllers.length).to.equal(0)
    expect(didDataAccount.nativeVerificationKeys.length).to.equal(0)
    expect(didDataAccount.otherControllers.length).to.equal(0)
    const rawDidDataAccount = await programProvider.connection.getAccountInfo(data)
    expect(rawDidDataAccount.data.length).to.equal(10_000)


    console.log("Your transaction signature1", tx);
  });

  //add data
  it("Service added!", async () => {
    const authority = programProvider.wallet;
    const [data, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const dataAccountBefore = await program.account.didAccount.fetch(data);
    expect(dataAccountBefore.services.length).to.equal(0);

    const tx = await program.methods.addService({
      id: "aws",
      serviceType: "serviceType",
      serviceEndpoint: "test"
    }).accounts({
      data: data,
    }).rpc()

    console.log("Your transaction signature2", tx);

    const dataAccountAfter = await program.account.didAccount.fetch(data);
    expect(dataAccountAfter.services.length).to.equal(1);
  });

  //functions used for following test
  async function testAddServiceError(data) {
    try{const tx = await program.methods.addService({
      id: "aws",
      serviceType: "serviceType2",
      serviceEndpoint: "test2"
    }).accounts({
      data: data
    }).rpc()} catch(error) {
      assert(error instanceof AnchorError)
      return 1;
    }
    return 0;
  }

  //add service with the same key, expect an error to pass the test
  it("Add service with the same ID", async () => {
    const authority = programProvider.wallet;
    const [data, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const result = testAddServiceError(data);
    expect(await result ).to.equal(1);
  });

  //delete a service
  it("Service deleted!", async () => {
    const authority = programProvider.wallet;
    const [data, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const dataAccountBefore = await program.account.didAccount.fetch(data);
    expect(dataAccountBefore.services.length).to.equal(1);
  
    const tx = await program.methods.removeService("aws").accounts({
      data: data,
    }).rpc()
  
    console.log("Your transaction signature2", tx);
  
    const dataAccountAfter = await program.account.didAccount.fetch(data);
    expect(dataAccountAfter.services.length).to.equal(0);
  });

  async function testRemoveServiceError(data) {
    try{const tx = await program.methods.removeService("aws",).accounts({
      data: data,
    }).rpc()} catch(error) {
      assert(error instanceof AnchorError)
      return 1;
    }
    return 0;
  }

  //delete a service that doesn't exist, expect an error to pass the test.
  it("Delete non-existing service", async () => {
    const authority = programProvider.wallet;
    const [data, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const result = testRemoveServiceError(data);
    expect(await result ).to.equal(1);
  });
});


