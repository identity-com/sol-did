import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { DidDataAccount, DidSolIdentifier, DidSolService } from "../../src";
import { before } from "mocha";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { expect } from "chai";
import { findProgramAddress } from "../../src/lib/utils";
import { TEST_CLUSTER } from "../utils/const";
import { Wallet } from "ethers";

chai.use(chaiAsPromised);


describe("sol-did controller operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  const authority = programProvider.wallet;

  let lastdidDataAccount: DidDataAccount;

  const solKey = anchor.web3.Keypair.generate();
  const ethKey = Wallet.createRandom();

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(
      program,
      authority.publicKey,
      didData,
      TEST_CLUSTER,
      authority,
      programProvider.opts);

    lastdidDataAccount = await service.getDidAccount();
  })

  it("fails to update the controller if it includes an invalid DID.", async () => {
    return expect(
      () => service.setControllers([`did:ethr:${ethKey.address}`, DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(), 'wrong-did' ])
    ).to.be.throw(
      "Invalid DID found in controllers"
    );
  });

  it("add update the controllers of a DID.", async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString();

    await service.setControllers(
      [
        ethrDid,
        solDid,
      ])
      .rpc()

    lastdidDataAccount = await service.getDidAccount();
    expect(lastdidDataAccount.nativeControllers).to.deep.equal([solKey.publicKey]);
    expect(lastdidDataAccount.otherControllers).to.deep.equal([ethrDid]);
  });

  it("add update the controllers of a DID and successfully filters duplicates", async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString();

    await service.setControllers(
      [
        ethrDid,
        solDid,
        ethrDid,
        solDid,
        ethrDid,
        solDid,
      ])
      .rpc()

    lastdidDataAccount = await service.getDidAccount();
    expect(lastdidDataAccount.nativeControllers).to.deep.equal([solKey.publicKey]);
    expect(lastdidDataAccount.otherControllers).to.deep.equal([ethrDid]);
  });

  it("cannot add itself as a controller", async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const selfSolDid = service.did;

    return expect(
      service.setControllers(
        [
          ethrDid,
          selfSolDid,
        ])
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: InvalidNativeControllers. Error Number: 6007. Error Message: Invalid native controllers. Cannot set itself as a controller."
    );
  });


});