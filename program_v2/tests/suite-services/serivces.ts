import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { DidDataAccount, DidSolService, findProgramAddress } from "../../src";
import { before } from "mocha";
import { getTestService } from "../utils/utils";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { expect } from "chai";
import { TEST_CLUSTER } from "../utils/const";
import { Wallet } from "ethers";
import { getDerivationPath, MNEMONIC } from "../fixtures/config";

chai.use(chaiAsPromised);

describe("sol-did service operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  let didDataAccount: DidDataAccount;

  const ethAuthority0 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(0));
  const ethAuthority1 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(1));

  const nonAuthoritySigner = anchor.web3.Keypair.generate();

  const authority = programProvider.wallet;

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(
      program,
      authority.publicKey,
      didData,
      TEST_CLUSTER,
      authority,
      programProvider.opts
    );

    // size up
    await service.resize(1_000).rpc();

    didDataAccount = await service.getDidAccount();
  });

  //add data
  it("add a new service to the data.services", async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(1);
    await service.addService(tService).rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore + 1);
  });

  //add service with the same key, expect an error to pass the test
  it("should fail to add service with the same ID", async () => {
    const tService = getTestService(1);
    tService.serviceEndpoint = "serviceEndpoint2"; // change to change payload

    return expect(service.addService(tService).rpc()).to.be.rejectedWith(
      "Error Code: ServiceFragmentAlreadyInUse. Error Number: 6004. Error Message: Service already exists in current service list."
    );
  });

  // delete a service
  it("can successfully delete a service", async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(1);
    await service.removeService(tService.fragment).rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore - 1);
  });

  // delete a service that doesn't exist, expect an error to pass the test.
  it("should fail to delete non-existing service", async () => {
    return expect(
      service.removeService("non-existing-service-id").rpc()
    ).to.be.rejectedWith(
      "Error Code: ServiceFragmentNotFound. Error Number: 6005. Error Message: Service doesn't exists in current service list."
    );
  });

  it("add a new service to the data.services with an ethereum key", async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(2);
    await service
      .addService(tService, nonAuthoritySigner.publicKey)
      .withEthSigner(ethAuthority0)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore + 1);
  });

  it("can successfully delete a service with an ethereum key", async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(2);
    await service
      .removeService(tService.fragment, nonAuthoritySigner.publicKey)
      .withEthSigner(ethAuthority1)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore - 1);
  });
});
