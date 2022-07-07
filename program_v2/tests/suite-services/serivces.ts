import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";

import { SolDid } from "../../target/types/sol_did";


describe("sol-did-service", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());


  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;


  //add data
  it("add a new service to the data.services", async () => {
    const authority = programProvider.wallet;
    const [didData, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const dataAccountBefore = await program.account.didAccount.fetch(didData);
    expect(dataAccountBefore.services.length).to.equal(0);

    const tx = await program.methods.addService({
      id: "aws",
      serviceType: "serviceType",
      serviceEndpoint: "test"
    }).accounts({
      didData,
    }).rpc()

    console.log("Your transaction signature2", tx);

    const dataAccountAfter = await program.account.didAccount.fetch(didData);
    expect(dataAccountAfter.services.length).to.equal(1);
  });

  //functions used for following test
  async function testAddServiceError(didData: anchor.web3.PublicKey) {
    try {
      const tx = await program.methods.addService({
        id: "aws",
        serviceType: "serviceType2",
        serviceEndpoint: "test2"
      }).accounts({
        didData,
      }).rpc()
    } catch(error) {
      return 1;
    }
    return 0;
  }

  //add service with the same key, expect an error to pass the test
  it("should fail to add service with the same ID", async () => {
    const authority = programProvider.wallet;
    const [didData, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const result = testAddServiceError(didData);
    expect(await result).to.equal(1);
  });

  //delete a service
  it("delete a service from the data.services", async () => {
    const authority = programProvider.wallet;
    const [didData, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const dataAccountBefore = await program.account.didAccount.fetch(didData);
    expect(dataAccountBefore.services.length).to.equal(1);

    const tx = await program.methods.removeService("aws").accounts({
      didData,
    }).rpc()

    console.log("Your transaction signature2", tx);

    const dataAccountAfter = await program.account.didAccount.fetch(didData);
    expect(dataAccountAfter.services.length).to.equal(0);
  });

  async function testRemoveServiceError(didData: anchor.web3.PublicKey) {
    try {
      const tx = await program.methods.removeService("aws",).accounts({
        didData,
      }).rpc()
    } catch(error) {
      return 1;
    }
    return 0;
  }

  //delete a service that doesn't exist, expect an error to pass the test.
  it("should fail to delete non-existing service", async () => {
    const authority = programProvider.wallet;
    const [didData, _] = await PublicKey
      .findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode("did-account"),
          authority.publicKey.toBuffer()
        ],
        program.programId
      );
    const result = testRemoveServiceError(didData);
    expect(await result).to.equal(1);
  });
});