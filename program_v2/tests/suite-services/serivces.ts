import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Transaction } from "@solana/web3.js";
import { SolDid } from "../../target/types/sol_did";
import { DidSolService } from "../../src";
import { before } from "mocha";
import { getTestService } from "../utils/utils";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { expect } from "chai";
import { findProgramAddress } from "../../src/lib/utils";

chai.use(chaiAsPromised);


describe("sol-did service operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  const authority = programProvider.wallet;

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(program, authority.publicKey, didData, programProvider);
  })

  //add data
  it("add a new service to the data.services", async () => {
    const dataAccountBefore = await program.account.didAccount.fetch(didData);
    const serviceLengthBefore = dataAccountBefore.services.length;

    const tService = getTestService(1)
    const instruction = await service.addService(tService);
    const transaction = new Transaction().add(instruction);
    await programProvider.sendAndConfirm(transaction);

    const dataAccountAfter = await program.account.didAccount.fetch(didData);
    expect(dataAccountAfter.services.length).to.equal(serviceLengthBefore + 1);
  });

  //add service with the same key, expect an error to pass the test
  it("should fail to add service with the same ID", async () => {
    const tService = getTestService(1)
    tService.serviceEndpoint = "serviceEndpoint2"; // change to change payload

    const instruction = await service.addService(tService);
    const transaction = new Transaction().add(instruction);

    return expect(
      programProvider.sendAndConfirm(transaction)
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${DidSolService.getErrorCode('ServiceAlreadyExists').toString(
        16
      )}`
    );
  });

  // delete a service
  it("can successfully delete a service", async () => {
    const dataAccountBefore = await program.account.didAccount.fetch(didData);
    const serviceLengthBefore = dataAccountBefore.services.length;

    const tService = getTestService(1)
    const instruction = await service.removeService(tService.id);
    const transaction = new Transaction().add(instruction);
    await programProvider.sendAndConfirm(transaction);

    const dataAccountAfter = await program.account.didAccount.fetch(didData);
    expect(dataAccountAfter.services.length).to.equal(serviceLengthBefore - 1);
  });

  // delete a service that doesn't exist, expect an error to pass the test.
  it("should fail to delete non-existing service", async () => {
    const instruction = await service.removeService('non-existing-service-id');
    const transaction = new Transaction().add(instruction);

    return expect(
      programProvider.sendAndConfirm(transaction)
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${DidSolService.getErrorCode('ServiceNotFound').toString(
        16
      )}`
    );
  });
});