import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { checkConnectionLogs } from "../utils/utils";
import { before } from "mocha";
import { DidSolService, VerificationMethodFlags } from "../../src";
import { findProgramAddress } from "../../src/lib/utils";
import { INITIAL_MIN_ACCOUNT_SIZE } from "../../src/lib/const";
import { TEST_CLUSTER } from "../utils/const";

chai.use(chaiAsPromised);

describe("sol-did alloc operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  let didData, didDataPDABump;
  let service: DidSolService;

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

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

    checkConnectionLogs(programProvider.connection);
  });

  it("can successfully close an did:sol account ", async () => {
    const destination = anchor.web3.Keypair.generate();

    // Accounts Before
    const rawDidDataAccountBefore =
      await programProvider.connection.getAccountInfo(didData);

    await service.close(destination.publicKey).rpc();

    // Accounts After
    const rawDidDataAccountAfter =
      await programProvider.connection.getAccountInfo(didData);
    const destinationAccountAfter =
      await programProvider.connection.getAccountInfo(destination.publicKey);
    expect(rawDidDataAccountAfter).to.be.null;
    expect(destinationAccountAfter.lamports).to.equal(
      rawDidDataAccountBefore.lamports
    );

    // console.log("Your transaction signature", tx);
  });

  it("fails when trying to close a did:sol account that does not exist", async () => {
    const destination = anchor.web3.Keypair.generate();

    return expect(
      service.close(destination.publicKey).rpc()
    ).to.be.rejectedWith(
      "Error Code: AccountNotInitialized. Error Number: 3012. " +
      "Error Message: The program expected this account to be already initialized"
    );
  });

  it("can successfully initialize an did:sol account with default size", async () => {
    await service.initialize(INITIAL_MIN_ACCOUNT_SIZE).rpc();

    // check data
    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.version).to.equal(0);
    expect(didDataAccount.bump).to.equal(didDataPDABump);
    expect(didDataAccount.nonce.eq(new anchor.BN(0))).to.be.true;

    expect(didDataAccount.nativeControllers.length).to.equal(0);
    expect(didDataAccount.otherControllers.length).to.equal(0);

    // TODO: It seems like anchor does not support custom structs in Vec mapping.
    expect(didDataAccount.services.length).to.equal(0);
    expect(didDataAccount.verificationMethods.length).to.equal(0);
    expect(didDataAccount.initialVerificationMethod.keyData).to.deep.equal(
      authority.publicKey.toBytes()
    );
    expect(didDataAccount.initialVerificationMethod.flags).to.equal(
      VerificationMethodFlags.CapabilityInvocation |
        VerificationMethodFlags.OwnershipProof
    );

    expect(didDataAccount.otherControllers.length).to.equal(0);
    const rawDidDataAccount = await programProvider.connection.getAccountInfo(
      didData
    );
    expect(rawDidDataAccount.data.length).to.equal(INITIAL_MIN_ACCOUNT_SIZE);
  });

  it("fails when trying to initialize a did:sol account twice", async () => {
    return expect(
      service.initialize(INITIAL_MIN_ACCOUNT_SIZE+1).rpc()
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x0`
    );
  });

  it("can successfully resize an account", async () => {
    const NEW_ACCOUNT_SIZE = (9_999);

    await service.resize(NEW_ACCOUNT_SIZE, authority.publicKey).rpc();

    const rawDidDataAccount = await programProvider.connection.getAccountInfo(
      didData
    );
    expect(rawDidDataAccount.data.length).to.equal(NEW_ACCOUNT_SIZE);
  });
});
