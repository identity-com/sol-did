import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { DidSolService } from "../../src";
import { before } from "mocha";
import { getTestService } from "../utils/utils";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { expect } from "chai";
import { findProgramAddress } from "../../src/lib/utils";
import { TEST_CLUSTER } from "../utils/const";

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
    service = new DidSolService(
      program,
      authority.publicKey,
      didData,
      TEST_CLUSTER,
      authority,
      programProvider.opts);
  })

  //add data
  it("add a new service to the data.services", async () => {
    const dataAccountBefore = await service.getDidAccount();
    const serviceLengthBefore = dataAccountBefore.services.length;

    const tService = getTestService(1)
    await service.addService(tService).rpc();

    const dataAccountAfter = await service.getDidAccount();
    expect(dataAccountAfter.services.length).to.equal(serviceLengthBefore + 1);
  });

  //add service with the same key, expect an error to pass the test
  it("should fail to add service with the same ID", async () => {
    const tService = getTestService(1)
    tService.serviceEndpoint = "serviceEndpoint2"; // change to change payload

    return expect(
      service.addService(tService).rpc()
    ).to.be.rejectedWith(
      "Error Code: ServiceAlreadyExists. Error Number: 6004. Error Message: ServiceID already exists in current service."
    );
  });

  // delete a service
  it("can successfully delete a service", async () => {
    const dataAccountBefore = await service.getDidAccount();
    const serviceLengthBefore = dataAccountBefore.services.length;

    const tService = getTestService(1)
    await service.removeService(tService.id).rpc();

    const dataAccountAfter = await service.getDidAccount();
    expect(dataAccountAfter.services.length).to.equal(serviceLengthBefore - 1);
  });

  // delete a service that doesn't exist, expect an error to pass the test.
  it("should fail to delete non-existing service", async () => {
    return expect(
      service.removeService('non-existing-service-id').rpc()
    ).to.be.rejectedWith(
      "Error Code: ServiceNotFound. Error Number: 6005. Error Message: ServiceID doesn't exists in current service."
    );
  });
});