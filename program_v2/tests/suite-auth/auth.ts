import * as anchor from "@project-serum/anchor";
import { LangErrorCode, Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { Transaction } from "@solana/web3.js";


import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { expect } from "chai";

import { ethSignPayload, findProgramAddress, VerificationMethodFlags, VerificationMethodType } from "../utils/utils";
import { before } from "mocha";
import { Wallet, utils } from "ethers";
import { DidSolService } from "../../src";


chai.use(chaiAsPromised);

describe("sol-did auth operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  let didData, didDataPDABump;
  let service: DidSolService;

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const newSolKey = anchor.web3.Keypair.generate();
  const newEthKey = Wallet.createRandom();
  const newEthKey2 = Wallet.createRandom();
  const nonAuthoritySigner = anchor.web3.Keypair.generate();




  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(program, authority.publicKey, didData, programProvider);

    // Fund nonAuthoritySigner
    const sigAirdrop = await programProvider.connection.requestAirdrop(
      nonAuthoritySigner.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await program.provider.connection.confirmTransaction(sigAirdrop);
  })

  it("fails when trying to close a did:sol account with a wrong authority", async () => {
    return expect(program.methods.close(null)
      .accounts({
        didData,
        authority: nonAuthoritySigner.publicKey,
        destination: nonAuthoritySigner.publicKey,
      })
      .signers([nonAuthoritySigner])
      .rpc()).to.be.rejectedWith(' Error Number: 2003. Error Message: A raw constraint was violated');
  });

  it("can add a new Ed25519VerificationKey2018 Key with CapabilityInvocation to an account", async () => {
    const tx = await program.methods.addVerificationMethod({
      alias: "new-key",
      keyData: newSolKey.publicKey.toBytes(),
      method: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, null).accounts({
      didData,
    }).rpc();

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.verificationMethods.length).to.equal(1)
    expect(didDataAccount.verificationMethods[0].alias).to.equal("new-key")
    expect(didDataAccount.verificationMethods[0].keyData).to.deep.equal(newSolKey.publicKey.toBytes())
    expect(didDataAccount.verificationMethods[0].method).to.deep.equal( { ed25519VerificationKey2018: {} })
    expect(didDataAccount.verificationMethods[0].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });

  it("can use the new ed25519VerificationKey2018 Key add a Service to the account", async () => {
    await program.methods.addService({
      id: "test",
      serviceType: "testType",
      serviceEndpoint: "testEndpoint"
    }, null).accounts({
      didData,
      authority: newSolKey.publicKey
    }).signers([newSolKey])
      .rpc()


    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(1)
    expect(didDataAccount.services[0].id).to.equal("test")
    expect(didDataAccount.services[0].serviceType).to.equal("testType")
    expect(didDataAccount.services[0].serviceEndpoint).to.equal("testEndpoint")
  });

  it("can not add a new key with OwnershipProof to an account", async () => {
    return expect(program.methods.addVerificationMethod({
      alias: "new-key",
      keyData: newSolKey.publicKey.toBytes(),
      method: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.OwnershipProof,
    }, null).accounts({
      didData,
    }).rpc()).to.be.rejectedWith('Error Message: Cannot add a verification method with OwnershipProof flag');
  });

  it("can not add a key if the alias already exists", async () => {
    return expect(program.methods.addVerificationMethod({
      alias: "default",
      keyData: newSolKey.publicKey.toBytes(),
      method: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, null).accounts({
      didData,
    }).rpc()).to.be.rejectedWith('Error Message: Given VM alias is already in use');
  });

  it("can add a new EcdsaSecp256k1RecoveryMethod2020 Key with CapabilityInvocation to an account", async () => {
    const ethAddressAsBytes = utils.arrayify(newEthKey.address)

    await program.methods.addVerificationMethod({
      alias: "new-eth-key",
      keyData: Buffer.from(ethAddressAsBytes),
      method: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, null).accounts({
      didData,
    }).rpc();

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.verificationMethods.length).to.equal(2)
    expect(didDataAccount.verificationMethods[1].alias).to.equal("new-eth-key")
    expect(didDataAccount.verificationMethods[1].keyData.length).to.equal(20)
    expect(didDataAccount.verificationMethods[1].keyData).to.deep.equal(ethAddressAsBytes)
    expect(didDataAccount.verificationMethods[1].method).to.deep.equal( { ecdsaSecp256K1RecoveryMethod2020: {} })
    expect(didDataAccount.verificationMethods[1].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)
    expect(didDataAccountBefore.nonce.toString()).to.be.equal("0");


    const instruction = await program.methods.addService({
      id: "test2",
      serviceType: "testType2",
      serviceEndpoint: "testEndpoint2"
    }, null).accounts({
      didData,
      authority: nonAuthoritySigner.publicKey
    }).instruction()

    const ethSignedInstruction = await ethSignPayload(instruction, didDataAccountBefore.nonce, newEthKey)
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(2)
    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.services[1].id).to.equal("test2")
    expect(didDataAccount.services[1].serviceType).to.equal("testType2")
    expect(didDataAccount.services[1].serviceEndpoint).to.equal("testEndpoint2")

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("cannot add a Service key with a wrong EcdsaSecp256k1RecoveryMethod2020 Key", async () => {
    const wrongEthKey = Wallet.createRandom();
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)


    const instruction = await program.methods.addService({
      id: "test2",
      serviceType: "testType2",
      serviceEndpoint: "testEndpoint2"
    }, null).accounts({
      didData,
      authority: nonAuthoritySigner.publicKey
    }).instruction()


    const signedInstruction = await ethSignPayload(instruction, didDataAccountBefore.nonce, wrongEthKey)
    const transaction = new Transaction().add(signedInstruction);

    // TODO: Translate Error from IDL
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add another EcdsaSecp256k1VerificationKey2019 to the account", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)

    const keyData = Buffer.from(utils.arrayify(newEthKey2.publicKey).slice(1))
    const instruction = await program.methods.addVerificationMethod({
      alias: "new-eth-key2",
      keyData,
      method: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, null).accounts({
      didData,
      authority: nonAuthoritySigner.publicKey
    }).instruction()

    const ethSignedInstruction = await ethSignPayload(instruction, didDataAccountBefore.nonce, newEthKey)
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.verificationMethods.length).to.equal(3)
    expect(didDataAccount.verificationMethods[2].alias).to.equal("new-eth-key2")
    expect(didDataAccount.verificationMethods[2].keyData.length).to.equal(64)
    expect(didDataAccount.verificationMethods[2].keyData).to.deep.equal(keyData)
    expect(didDataAccount.verificationMethods[2].method).to.deep.equal( { ecdsaSecp256K1VerificationKey2019: {} })
    expect(didDataAccount.verificationMethods[2].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("can use the new EcdsaSecp256k1VerificationKey2019 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await program.account.didAccount.fetch(didData)


    const instruction = await program.methods.addService({
      id: "test3",
      serviceType: "testType3",
      serviceEndpoint: "testEndpoint3"
    }, null).accounts({
      didData,
      authority: nonAuthoritySigner.publicKey
    }).instruction()

    const ethSignedInstruction = await ethSignPayload(instruction, didDataAccountBefore.nonce, newEthKey2)
    const transaction = new Transaction().add(ethSignedInstruction);
    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])

    const didDataAccount = await program.account.didAccount.fetch(didData)

    expect(didDataAccount.services.length).to.equal(3)
    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.services[2].id).to.equal("test3")
    expect(didDataAccount.services[2].serviceType).to.equal("testType3")
    expect(didDataAccount.services[2].serviceEndpoint).to.equal("testEndpoint3")

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });




});
