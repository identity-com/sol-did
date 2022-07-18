import * as anchor from "@project-serum/anchor";
import { LangErrorCode, Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { airdrop, getTestService, } from "../utils/utils";
import { before } from "mocha";
import { utils, Wallet } from "ethers";
import { DidSolService, VerificationMethodFlags, VerificationMethodType } from "../../src";
import { findProgramAddress } from "../../src/lib/utils";
import { getDerivationPath, MNEMONIC } from "../fixtures/config";
import { DEFAULT_KEY_ID } from "../../src/lib/const";


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
  const newSolKeyAlias = "new-sol-key";
  const newEthKey = Wallet.createRandom();
  const newEthKeyAlias = "new-eth-key";
  const newEthKey2 = Wallet.createRandom();
  const newEthKeyAlias2 = "new-eth-key2";

  before(async () => {
    [didData, didDataPDABump] = await findProgramAddress(solAuthority.publicKey);
    service = new DidSolService(
      program,
      solAuthority.publicKey,
      didData,
      'localnet',
      solAuthority,
      programProvider.opts);

    // Fund nonAuthoritySigner
    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);
  })

  it("fails when trying to close a did:sol account with a wrong authority", async () => {

    return expect(
      service.close(nonAuthoritySigner.publicKey, nonAuthoritySigner.publicKey)
        .withPartialSigners(nonAuthoritySigner)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated"
    );
  });

  it("can add a new Ed25519VerificationKey2018 Key with CapabilityInvocation to an account", async () => {
    await service.addVerificationMethod(
      {
        alias: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      }).rpc();

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.verificationMethods.length).to.equal(1)
    expect(didDataAccount.verificationMethods[0].alias).to.equal(newSolKeyAlias)
    expect(didDataAccount.verificationMethods[0].keyData).to.deep.equal(newSolKey.publicKey.toBytes())
    expect(didDataAccount.verificationMethods[0].methodType).to.equal( VerificationMethodType.Ed25519VerificationKey2018)
    expect(didDataAccount.verificationMethods[0].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });

  it("can use the new ed25519VerificationKey2018 Key add a Service to the account", async () => {
    const tService = getTestService(1)

    await service.addService(tService, newSolKey.publicKey)
      .withPartialSigners(newSolKey)
      .rpc();

    const didDataAccount = await service.getDidAccount()

    expect(didDataAccount.services.length).to.equal(1)
    expect(didDataAccount.services[0].id).to.equal(tService.id)
    expect(didDataAccount.services[0].serviceType).to.equal(tService.serviceType)
    expect(didDataAccount.services[0].serviceEndpoint).to.equal(tService.serviceEndpoint)
  });

  it("can not add a new key with OwnershipProof to an account", async () => {
    return expect(
      service.addVerificationMethod(
        {
          alias: "new-key",
          keyData: newSolKey.publicKey.toBytes(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: VerificationMethodFlags.OwnershipProof,
        }).rpc()
    ).to.be.rejectedWith(
      "VmOwnershipOnAdd. Error Number: 6002. Error Message: Cannot add a verification method with OwnershipProof flag."
    );
  });

  it("can not add a key if the alias already exists", async () => {
    return expect(
      service.addVerificationMethod(
        {
          alias: "default",
          keyData: newSolKey.publicKey.toBytes(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: VerificationMethodFlags.CapabilityInvocation,
        }).rpc()
    ).to.be.rejectedWith(
      "Error Code: VmAliasAlreadyInUse. Error Number: 6001. Error Message: Given VM alias is already in use"
    );
  });

  it("can add a new EcdsaSecp256k1RecoveryMethod2020 Key with CapabilityInvocation to an account", async () => {
    const ethAddressAsBytes = utils.arrayify(newEthKey.address)

    await service.addVerificationMethod(
      {
        alias: newEthKeyAlias,
        keyData: Buffer.from(ethAddressAsBytes),
        methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
        flags: VerificationMethodFlags.CapabilityInvocation,
      }).rpc();

    const didDataAccount = await service.getDidAccount()

    expect(didDataAccount.verificationMethods.length).to.equal(2)
    expect(didDataAccount.verificationMethods[1].alias).to.equal(newEthKeyAlias)
    expect(didDataAccount.verificationMethods[1].keyData.length).to.equal(20)
    expect(didDataAccount.verificationMethods[1].keyData).to.deep.equal(ethAddressAsBytes)
    expect(didDataAccount.verificationMethods[1].methodType).to.equal( VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020)
    expect(didDataAccount.verificationMethods[1].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    expect(didDataAccountBefore.nonce.toString()).to.be.equal("0");
    const tService = getTestService(2)

    // use transaction to test replay attack
    const transaction = await service.addService(tService, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount()

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


    return expect(
      service.addService(tService, nonAuthoritySigner.publicKey)
        .withEthSigner(wrongEthKey)
        .withPartialSigners(nonAuthoritySigner)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated"
    );
  });


  it("can use the new EcdsaSecp256k1RecoveryMethod2020 Key add another EcdsaSecp256k1VerificationKey2019 to the account", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    const keyData = Buffer.from(utils.arrayify(newEthKey2.publicKey).slice(1))

    // use transaction to test replay attack
    const transaction = await service.addVerificationMethod(
      {
        alias: newEthKeyAlias2,
        keyData,
        methodType: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
        flags: VerificationMethodFlags.CapabilityInvocation,
      }, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey)
      .withPartialSigners(nonAuthoritySigner)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);


    const didDataAccount = await service.getDidAccount()

    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.verificationMethods.length).to.equal(3)
    expect(didDataAccount.verificationMethods[2].alias).to.equal(newEthKeyAlias2)
    expect(didDataAccount.verificationMethods[2].keyData.length).to.equal(64)
    expect(didDataAccount.verificationMethods[2].keyData).to.deep.equal(keyData)
    expect(didDataAccount.verificationMethods[2].methodType).to.equal( VerificationMethodType.EcdsaSecp256k1VerificationKey2019)
    expect(didDataAccount.verificationMethods[2].flags).to.equal(VerificationMethodFlags.CapabilityInvocation)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("can use the new EcdsaSecp256k1VerificationKey2019 Key add a Service to the account and not reuse nonce", async () => {
    const didDataAccountBefore = await service.getDidAccount()

    const tService = getTestService(4)

    // use transaction to test replay attack
    const transaction = await service.addService(tService, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey2)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount()

    expect(didDataAccount.services.length).to.equal(3)
    expect(didDataAccount.nonce.toString()).to.be.equal(didDataAccountBefore.nonce.addn(1).toString());
    expect(didDataAccount.services[2].id).to.equal(tService.id)
    expect(didDataAccount.services[2].serviceType).to.equal(tService.serviceType)
    expect(didDataAccount.services[2].serviceEndpoint).to.equal(tService.serviceEndpoint)

    // it cannot reuse a nonce
    return expect(programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]))
      .to.be.rejectedWith(`Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(16)}`);
  });

  it("cannot update the flags of an unknown verification method", async () => {
    const unknownAlias = 'unknown-alias'

    // use transaction to test replay attack
    return expect(
      service.setVerificationMethodFlags(unknownAlias, VerificationMethodFlags.None)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: VmAliasNotFound. Error Number: 6000. Error Message: No VM with the given alias exists."
    );
  });

  it("can update the flags (without Ownership Proof) of a verification method with a different verification method", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length


    // Update with Wallet Key
    const newFlags = VerificationMethodFlags.CapabilityInvocation | VerificationMethodFlags.Authentication
    await service.setVerificationMethodFlags(newEthKeyAlias, newFlags).rpc()

    const didDataAccount = await service.getDidAccount()
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore)
    expect(didDataAccount.verificationMethods[1].alias).to.equal(newEthKeyAlias)
    expect(didDataAccount.verificationMethods[1].flags).to.equal(newFlags)
  });

  it("cannot update the flags (WITH Ownership Proof) of a verification method with a different verification method", async () => {
    const newFlags = VerificationMethodFlags.CapabilityInvocation | VerificationMethodFlags.OwnershipProof
    return expect(
      service.setVerificationMethodFlags(newEthKeyAlias, newFlags)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated."
    );
  });

  it("can update the flags (WITH Ownership Proof) of a verification method with a same verification method", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length


    // Update with Wallet Key
    const newFlags = VerificationMethodFlags.CapabilityInvocation | VerificationMethodFlags.OwnershipProof
    await service.setVerificationMethodFlags(newEthKeyAlias, newFlags, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey)
      .withPartialSigners(nonAuthoritySigner)
      .rpc()

    const didDataAccount = await service.getDidAccount()
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore)
    expect(didDataAccount.verificationMethods[1].alias).to.equal(newEthKeyAlias)
    expect(didDataAccount.verificationMethods[1].flags).to.equal(newFlags)
  });


  it("successfully set flags to 0 when removing the default verification method", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    expect(didDataAccountBefore.initialVerificationMethod.flags).to.not.equal(0)

    await service.removeVerificationMethod(DEFAULT_KEY_ID)
      .rpc()

    const didDataAccount = await service.getDidAccount()
    expect(didDataAccount.initialVerificationMethod.flags).to.equal(0)
  });

  it("can remove a verification method with the same verification method", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length

    await service.removeVerificationMethod(newEthKeyAlias2, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey2)
      .withPartialSigners(nonAuthoritySigner)
      .rpc()

    const didDataAccount = await service.getDidAccount()
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore - 1)
  });

  it("can remove a verification method with a different verification method", async () => {
    const didDataAccountBefore = await service.getDidAccount()
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length

    await service.removeVerificationMethod(newEthKeyAlias, newSolKey.publicKey)
      .withPartialSigners(newSolKey)
      .rpc()

    const didDataAccount = await service.getDidAccount()
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore - 1)
  });

  it("cannot remove the last VM with a CapabilityInvocation", async () => {
    return expect(
      service.removeVerificationMethod(newSolKeyAlias, newSolKey.publicKey)
        .withPartialSigners(newSolKey)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: VmCannotRemoveLastAuthority. Error Number: 6003. " +
      "Error Message: Removing the last verification method would lead to a lockout."
    );
  });

  it("cannot update flags (without CapabilityInvocation) of the last VM with a CapabilityInvocation", async () => {
    return expect(
      service.setVerificationMethodFlags(newSolKeyAlias, VerificationMethodFlags.None, newSolKey.publicKey)
        .withPartialSigners(newSolKey)
        .rpc()
    ).to.be.rejectedWith(
      "Error Code: VmCannotRemoveLastAuthority. Error Number: 6003. " +
      "Error Message: Removing the last verification method would lead to a lockout."
    );
  });

});
