import * as anchor from "@project-serum/anchor";
import { LangErrorCode, Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { INITIAL_ACCOUNT_SIZE } from "../utils/const";
import { findProgramAddress, VerificationMethodFlags } from "../utils/utils";
import { before } from "mocha";
import { DidSolService } from "../../src";

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
      programProvider
    );

    // init with correct signer
    service.setSolSigner(authority);
  });

  it("can successfully close an did:sol account ", async () => {
    const destination = anchor.web3.Keypair.generate();

    // Accounts Before
    const rawDidDataAccountBefore =
      await programProvider.connection.getAccountInfo(didData);

    const tx = await service.close(destination.publicKey);

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

    return expect(service.close(destination.publicKey)).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.AccountNotInitialized.toString(
        16
      )}`
    );
  });

  it("can successfully initialize an did:sol account with default size", async () => {
    // console.log(`didData: ${didData.toBase58()}`);

    const tx = await program.methods
      .initialize(null)
      .accounts({
        didData,
        authority: authority.publicKey,
      })
      .rpc();

    // console.log("Your transaction signature", tx);

    // check data
    const didDataAccount = await program.account.didAccount.fetch(didData);
    expect(didDataAccount.version).to.equal(0);
    expect(didDataAccount.bump).to.equal(didDataPDABump);
    expect(didDataAccount.nonce.eq(new anchor.BN(0))).to.be.true;

    expect(didDataAccount.nativeControllers.length).to.equal(0);
    expect(didDataAccount.otherControllers.length).to.equal(0);

    // TODO: It seems like anchor does not support custom structs in Vec mapping.
    expect(didDataAccount.services.length).to.equal(0);
    expect(didDataAccount.verificationMethods.length).to.equal(0);
    expect(didDataAccount.initialAuthority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(didDataAccount.initialAuthorityFlags).to.equal(
      VerificationMethodFlags.CapabilityInvocation |
        VerificationMethodFlags.OwnershipProof
    );

    expect(didDataAccount.otherControllers.length).to.equal(0);
    const rawDidDataAccount = await programProvider.connection.getAccountInfo(
      didData
    );
    expect(rawDidDataAccount.data.length).to.equal(INITIAL_ACCOUNT_SIZE);
  });

  it("fails when trying to initialize a did:sol account twice", async () => {
    return expect(
      program.methods
        .initialize(100)
        .accounts({
          didData,
          authority: authority.publicKey,
        })
        .rpc()
    ).to.be.rejectedWith("custom program error: 0x0");
  });

  it("can successfully resize an account", async () => {
    const NEW_ACCOUNT_SIZE = 10_000;

    await program.methods
      .resize(NEW_ACCOUNT_SIZE)
      .accounts({
        didData,
        payer: authority.publicKey,
      })
      .rpc();

    const rawDidDataAccount = await programProvider.connection.getAccountInfo(
      didData
    );
    expect(rawDidDataAccount.data.length).to.equal(NEW_ACCOUNT_SIZE);
  });
});
