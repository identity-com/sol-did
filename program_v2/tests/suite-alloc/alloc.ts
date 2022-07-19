import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { airdrop, checkConnectionLogs, getTestService } from "../utils/utils";
import { before } from "mocha";
import {
  DidAccountSizeHelper,
  DidDataAccount,
  DidSolIdentifier,
  DidSolService, VerificationMethod,
  VerificationMethodFlags, VerificationMethodType
} from "../../src";
import { findProgramAddress, INITIAL_MIN_ACCOUNT_SIZE } from "../../src";
import { TEST_CLUSTER } from "../utils/const";
import { utils, Wallet } from "ethers";

chai.use(chaiAsPromised);

describe("sol-did alloc operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  let didData, didDataPDABump;
  let service: DidSolService;

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const ethKey = Wallet.createRandom();

  const nonAuthoritySigner = anchor.web3.Keypair.generate();

  let didDataAccount: DidDataAccount | null = null;
  let didDataAccountSize: number = 0;

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

    // Fund nonAuthoritySigner
    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);
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
    await service.initialize().rpc();

    // check data
    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.version).to.equal(0);
    expect(didDataAccount.bump).to.equal(didDataPDABump);
    expect(didDataAccount.nonce.eq(new anchor.BN(0))).to.be.true;

    expect(didDataAccount.nativeControllers.length).to.equal(0);
    expect(didDataAccount.otherControllers.length).to.equal(0);

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
    expect(didDataAccountSize).to.equal(INITIAL_MIN_ACCOUNT_SIZE);

    // close again
    await service.close(authority.publicKey).rpc();
  });

  it("can automatically initialize an account with autoAlloc", async () => {
    const tService = getTestService(1);
    await service.addService(tService).withAutomaticAlloc(authority.publicKey).rpc();

    // check data
    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.services.length).to.equal(1);
    expect(didDataAccountSize).to.equal(INITIAL_MIN_ACCOUNT_SIZE + DidAccountSizeHelper.getServiceSize(tService));
  });

  it("can automatically resize an account with autoAlloc", async () => {
    const tService = getTestService(2);
    await service.addService(tService).withAutomaticAlloc(authority.publicKey).rpc();

    // check data
    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.services.length).to.equal(2);
    expect(didDataAccountSize).to.equal(INITIAL_MIN_ACCOUNT_SIZE + 2*DidAccountSizeHelper.getServiceSize(tService));
  });

  it("will not shrink an account", async () => {
    const didDataAccountSizeBefore = didDataAccountSize;
    const tService = getTestService(1);
    await service.removeService(tService.fragment).withAutomaticAlloc(authority.publicKey).rpc();

    // check data
    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.services.length).to.equal(1);
    expect(didDataAccountSize).to.equal(didDataAccountSizeBefore);
  });

  it("will not resize if the current account size is sufficient.", async () => {
    const didDataAccountSizeBefore = didDataAccountSize;
    const solKey = anchor.web3.Keypair.generate();
    const controllerDid = DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString();
    await service.setControllers([controllerDid]).withAutomaticAlloc(authority.publicKey).rpc();
    expect(didDataAccountSizeBefore).to.be.greaterThan(DidAccountSizeHelper.fromAccount(didDataAccount).getTotalNativeAccountSize() + 32);

    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.nativeControllers.length).to.equal(1);
    expect(didDataAccountSize).to.equal(didDataAccountSizeBefore);
  });

  it("will only resize to amount needed, reusing overhead space", async () => {
    const didDataAccountSizeBefore = didDataAccountSize;
    const ethAddressAsBytes = utils.arrayify(ethKey.address);

    const method: VerificationMethod = {
      fragment: 'eth-key',
      keyData: Buffer.from(ethAddressAsBytes),
      methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }
    const vmSize = DidAccountSizeHelper.getVerificationMethodSize(method);
    const removedServiceSize = DidAccountSizeHelper.getServiceSize(getTestService(1));

    await service.addVerificationMethod(method).withAutomaticAlloc(authority.publicKey).rpc();

    // check data
    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.verificationMethods.length).to.equal(1);
    expect(didDataAccountSize).to.equal(didDataAccountSizeBefore + vmSize + 32 - removedServiceSize);
  });

  // resize also works with ethereum keys
  it("will also auto-alloc with ethereum keys", async () => {
    const didDataAccountSizeBefore = didDataAccountSize;

    const existingControllers = await service.resolve().then(res => res.controller) as string[];
    expect(existingControllers.length).to.equal(1);
    const newController = `did:ethr:${ethKey.address}`;
    await service.setControllers([...existingControllers, newController], nonAuthoritySigner.publicKey)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .withEthSigner(ethKey)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    [didDataAccount, didDataAccountSize] = await service.getDidAccountWithSize();
    expect(didDataAccount.nativeControllers.length).to.equal(1);
    expect(didDataAccount.otherControllers.length).to.equal(1);

    expect(didDataAccountSize).to.equal(didDataAccountSizeBefore + newController.length + 4);
  });

  it("will reuse the authority of the original instruction for the resize", async () => {
    const existingControllers = await service.resolve().then(res => res.controller) as string[];
    expect(existingControllers.length).to.equal(2);
    const newSolKey = anchor.web3.Keypair.generate();
    const newController = DidSolIdentifier.create(newSolKey.publicKey, TEST_CLUSTER).toString();
    const instructions = await service.setControllers([...existingControllers, newController], nonAuthoritySigner.publicKey)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .withEthSigner(ethKey)
      .withPartialSigners(nonAuthoritySigner)
      .instructions();

    expect(instructions.length).to.equal(2); // resize + setControllers
    // resize has payer on [1]
    // resize has authority on [2]
    // setControllers has authority on [1]
    expect(instructions[0].keys[2]).to.be.deep.equal(instructions[1].keys[1]);
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

  it("fails when trying to resize to insufficient size", async () => {
    const NEW_ACCOUNT_SIZE = INITIAL_MIN_ACCOUNT_SIZE - 1;

    return expect(
      service.resize(NEW_ACCOUNT_SIZE, authority.publicKey).rpc()
    ).to.be.rejectedWith(
      'Error Code: AccountDidNotSerialize. Error Number: 3004. Error Message: Failed to serialize the account'
    );
  });
});
