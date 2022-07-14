import * as anchor from "@project-serum/anchor";
import { LangErrorCode, Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { Transaction } from "@solana/web3.js";


import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { expect } from "chai";

import {
  airdrop,
  getTestService,
} from "../utils/utils";
import { before } from "mocha";
import { Wallet, utils } from "ethers";
import { DidSolService, VerificationMethodFlags, VerificationMethodType } from "../../src";
import { findProgramAddress } from "../../src/lib/utils";
import { getDerivationPath, MNEMONIC } from "../fixtures/config";


chai.use(chaiAsPromised);

describe("sol-did auth operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  const solAuthority = programProvider.wallet;
  const ethAuthority = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());

  const nonAuthoritySigner = anchor.web3.Keypair.generate();

  const newSolKey = anchor.web3.Keypair.generate();
  const newEthKey = Wallet.createRandom();
  const newEthKey2 = Wallet.createRandom();

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(solAuthority.publicKey);
    service = new DidSolService(program, solAuthority.publicKey, didData, programProvider);

    // Fund nonAuthoritySigner
    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);
  })

  it("fails when trying to close a did:sol account with a wrong authority", async () => {
    const instruction = await service.close(nonAuthoritySigner.publicKey, nonAuthoritySigner.publicKey);
    const tx = new Transaction().add(instruction);

    return expect(programProvider.sendAndConfirm(tx, [nonAuthoritySigner])).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(
        16
      )}`
    );
  });

  it("can add a new Ed25519VerificationKey2018 Key with CapabilityInvocation to an account", async () => {
    const instruction = await service.addVerificationMethod(
      {
        alias: "new-key",
        keyData: newSolKey.publicKey.toBytes(),
        type: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      });
    const tx = new Transaction().add(instruction);
    await programProvider.sendAndConfirm(tx);

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.verificationMethods.length).to.equal(1)
    expect(didDataAccount.verificationMethods[0].alias).to.equal("new-key")
    expect(didDataAccount.verificationMethods[0].keyData).to.deep.equal(newSolKey.publicKey.toBytes())
    expect(didDataAccount.verificationMethods[0].methodType).to.deep.equal( { ed25519VerificationKey2018: {} })
    expect(didDataAccount.verificationMethods[0].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });

  it("can use the new ed25519VerificationKey2018 Key add a Service to the account", async () => {
    const tService = getTestService(1)

    const instruction = await service.addService(tService, newSolKey.publicKey);
    const transaction = new Transaction().add(instruction);
    await programProvider.sendAndConfirm(transaction, [newSolKey])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(1)
    expect(didDataAccount.services[0].id).to.equal(tService.id)
    expect(didDataAccount.services[0].serviceType).to.equal(tService.serviceType)
    expect(didDataAccount.services[0].serviceEndpoint).to.equal(tService.serviceEndpoint)
  });

  it("can not add a new key with OwnershipProof to an account", async () => {
    const instruction = await service.addVerificationMethod(
      {
        alias: "new-key",
        keyData: newSolKey.publicKey.toBytes(),
        type: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.OwnershipProof,
      });
    const tx = new Transaction().add(instruction);

    return expect(
      programProvider.sendAndConfirm(tx)
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${DidSolService.getErrorCode('VmOwnershipOnAdd').toString(
        16
      )}`
    );
  });

  it("can not add a key if the alias already exists", async () => {
    const instruction = await service.addVerificationMethod(
      {
        alias: "default",
        keyData: newSolKey.publicKey.toBytes(),
        type: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      });
    const tx = new Transaction().add(instruction);
    return expect(
      programProvider.sendAndConfirm(tx)
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${DidSolService.getErrorCode('VmAliasAlreadyInUse').toString(
        16
      )}`
    );
  });

  it("can add a new EcdsaSecp256k1RecoveryMethod2020 Key with CapabilityInvocation to an account", async () => {
    const ethAddressAsBytes = utils.arrayify(newEthKey.address)

    const instruction = await service.addVerificationMethod(
      {
        alias: "new-eth-key",
        keyData: Buffer.from(ethAddressAsBytes),
        type: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
        flags: VerificationMethodFlags.CapabilityInvocation,
      });
    const tx = new Transaction().add(instruction);
    await programProvider.sendAndConfirm(tx);

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.verificationMethods.length).to.equal(2)
    expect(didDataAccount.verificationMethods[1].alias).to.equal("new-eth-key")
    expect(didDataAccount.verificationMethods[1].keyData.length).to.equal(20)
    expect(didDataAccount.verificationMethods[1].keyData).to.deep.equal(ethAddressAsBytes)
    expect(didDataAccount.verificationMethods[1].methodType).to.deep.equal( { ecdsaSecp256K1RecoveryMethod2020: {} })
    expect(didDataAccount.verificationMethods[1].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)
    expect(didDataAccountBefore.nonce.toString()).to.be.equal("0");
    const tService = getTestService(2)

    const instruction = await service.addService(tService, nonAuthoritySigner.publicKey);
    const ethSignedInstruction = await service.ethSignInstruction(instruction, newEthKey);
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(2)
    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.services[1].id).to.equal(tService.id)
    expect(didDataAccount.services[1].serviceType).to.equal(tService.serviceType)
    expect(didDataAccount.services[1].serviceEndpoint).to.equal(tService.serviceEndpoint)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("cannot add a Service key with a wrong EcdsaSecp256k1RecoveryMethod2020 Key", async () => {
    const wrongEthKey = Wallet.createRandom();
    const tService = getTestService(3);

    const instruction = await service.addService(tService, nonAuthoritySigner.publicKey);
    const ethSignedInstruction = await service.ethSignInstruction(instruction, wrongEthKey);
    const transaction = new Transaction().add(ethSignedInstruction);

    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add another EcdsaSecp256k1VerificationKey2019 to the account", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)
    const keyData = Buffer.from(utils.arrayify(newEthKey2.publicKey).slice(1))

    const instruction = await service.addVerificationMethod(
      {
        alias: "new-eth-key2",
        keyData,
        type: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
        flags: VerificationMethodFlags.CapabilityInvocation,
      }, nonAuthoritySigner.publicKey);
    // sign
    const ethSignedInstruction = await service.ethSignInstruction(instruction, newEthKey)
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.verificationMethods.length).to.equal(3)
    expect(didDataAccount.verificationMethods[2].alias).to.equal("new-eth-key2")
    expect(didDataAccount.verificationMethods[2].keyData.length).to.equal(64)
    expect(didDataAccount.verificationMethods[2].keyData).to.deep.equal(keyData)
    expect(didDataAccount.verificationMethods[2].methodType).to.deep.equal( { ecdsaSecp256K1VerificationKey2019: {} })
    expect(didDataAccount.verificationMethods[2].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("can use the new EcdsaSecp256k1VerificationKey2019 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)

    const tService = getTestService(4)

    const instruction = await service.addService(tService, nonAuthoritySigner.publicKey);
    const ethSignedInstruction = await service.ethSignInstruction(instruction, newEthKey2);
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(3)
    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.services[2].id).to.equal(tService.id)
    expect(didDataAccount.services[2].serviceType).to.equal(tService.serviceType)
    expect(didDataAccount.services[2].serviceEndpoint).to.equal(tService.serviceEndpoint)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });
});
