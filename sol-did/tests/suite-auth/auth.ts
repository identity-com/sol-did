import * as anchor from '@project-serum/anchor';
import { LangErrorCode, Program } from '@project-serum/anchor';
import { SolDid } from '@identity.com/sol-did-idl';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { airdrop, getTestService } from '../utils/utils';
import { before } from 'mocha';
import { utils, Wallet } from 'ethers';
import {
  BitwiseVerificationMethodFlag,
  DEFAULT_KEY_ID,
  DidSolIdentifier,
  DidSolService,
  findProgramAddress,
  VerificationMethodType,
} from '@identity.com/sol-did-client';
import { TEST_CLUSTER } from '../utils/const';

chai.use(chaiAsPromised);

describe('sol-did auth operations', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  const authority = programProvider.wallet;

  const nonAuthoritySigner = anchor.web3.Keypair.generate();

  const newSolKey = anchor.web3.Keypair.generate();
  const newSolKeyAlias = 'new-sol-key';
  const newEthKey = Wallet.createRandom();
  const newEthKeyAlias = 'new-eth-key';
  const newEthKey2 = Wallet.createRandom();
  const newEthKeyAlias2 = 'new-eth-key2';

  before(async () => {
    [didData, didDataPDABump] = findProgramAddress(authority.publicKey);
    service = await DidSolService.buildFromAnchor(
      program,
      DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER),
      programProvider
    );

    // size up
    await service.resize(1_000).rpc();
    // Fund nonAuthoritySigner
    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);
  });

  it('fails when trying to close a did:sol account with a wrong authority', async () => {
    return expect(
      service
        .close(nonAuthoritySigner.publicKey, nonAuthoritySigner.publicKey)
        .withPartialSigners(nonAuthoritySigner)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated'
    );
  });

  it('can add a new Ed25519VerificationKey2018 Key with CapabilityInvocation to an account', async () => {
    await service
      .addVerificationMethod({
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBuffer(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
      })
      .rpc();

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.verificationMethods.length).to.equal(2);
    expect(didDataAccount.verificationMethods[1].fragment).to.equal(
      newSolKeyAlias
    );
    expect(didDataAccount.verificationMethods[1].keyData).to.deep.equal(
      newSolKey.publicKey.toBuffer()
    );
    expect(didDataAccount.verificationMethods[1].methodType).to.equal(
      VerificationMethodType.Ed25519VerificationKey2018
    );
    expect(didDataAccount.verificationMethods[1].flags.array).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
    ]);
  });

  it('can use the new ed25519VerificationKey2018 Key add a Service to the account', async () => {
    const tService = getTestService(1);

    await service
      .addService(tService, false, newSolKey.publicKey)
      .withPartialSigners(newSolKey)
      .rpc();

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.services.length).to.equal(1);
    expect(didDataAccount.services[0]).to.deep.equal(tService);
  });

  it('cannot add a new verification method when the Ownership Proof Verification Method Flag is applied', async () => {
    return expect(
      service
        .addVerificationMethod({
          fragment: 'new-key',
          keyData: newSolKey.publicKey.toBuffer(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: [BitwiseVerificationMethodFlag.OwnershipProof],
        })
        .rpc()
    ).to.be.rejectedWith('VmGuardedFlagOnAdd. Error Number: 6002');
  });

  it('cannot add a new verification method when the Protected Verification Method Flag is applied', async () => {
    return expect(
      service
        .addVerificationMethod({
          fragment: 'new-key',
          keyData: newSolKey.publicKey.toBuffer(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: [BitwiseVerificationMethodFlag.Protected],
        })
        .rpc()
    ).to.be.rejectedWith('VmGuardedFlagOnAdd. Error Number: 6002');
  });

  it('can not add a new key with an invalid flag', async () => {
    return expect(
      service
        .addVerificationMethod({
          fragment: 'invalid-flag-key',
          keyData: newSolKey.publicKey.toBuffer(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: [1 << 15],
        })
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: ConversionError. Error Number: 6009. Error Message: Could not convert between data types.'
    );
  });

  it('can not add a key with the default fragment name', async () => {
    return expect(
      service
        .addVerificationMethod({
          fragment: DEFAULT_KEY_ID,
          keyData: newSolKey.publicKey.toBuffer(),
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
        })
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmFragmentAlreadyInUse. Error Number: 6001. Error Message: Given VM fragment is already in use.'
    );
  });

  it('can add a new EcdsaSecp256k1RecoveryMethod2020 Key with CapabilityInvocation to an account', async () => {
    const ethAddressAsBytes = utils.arrayify(newEthKey.address);

    await service
      .addVerificationMethod({
        fragment: newEthKeyAlias,
        keyData: Buffer.from(ethAddressAsBytes),
        methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
        flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
      })
      .rpc();

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.verificationMethods.length).to.equal(3);
    expect(didDataAccount.verificationMethods[2].fragment).to.equal(
      newEthKeyAlias
    );
    expect(didDataAccount.verificationMethods[2].keyData.length).to.equal(20);
    expect(didDataAccount.verificationMethods[2].keyData).to.deep.equal(
      ethAddressAsBytes
    );
    expect(didDataAccount.verificationMethods[2].methodType).to.equal(
      VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020
    );
    expect(didDataAccount.verificationMethods[2].flags.array).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
    ]);
  });

  it('can use the new EcdsaSecp256k1RecoveryMethod2020 Key add a Service to the account and not reuse nonce', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    expect(didDataAccountBefore.nonce.toString()).to.be.equal('0');
    const tService = getTestService(2);

    // use transaction to test replay attack
    const transaction = await service
      .addService(tService, false, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.services.length).to.equal(2);
    expect(didDataAccount.nonce.toString()).to.be.equal(
      didDataAccountBefore.nonce.addn(1).toString()
    );
    expect(didDataAccount.services[0]).to.deep.equal(tService);

    // it cannot reuse a nonce
    return expect(
      programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(
        16
      )}`
    );
  });

  it('can use the new EcdsaSecp256k1RecoveryMethod2020 Key and update a Service to the account and not reuse nonce', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    expect(didDataAccountBefore.nonce.toString()).to.be.equal('1');
    const tService = getTestService(2);
    tService.serviceEndpoint = `${tService.serviceEndpoint}-updated`;

    // use transaction to test replay attack
    const transaction = await service
      .addService(tService, true, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.services.length).to.equal(2);
    expect(didDataAccount.nonce.toString()).to.be.equal(
      didDataAccountBefore.nonce.addn(1).toString()
    );
    expect(didDataAccount.services[0]).to.deep.equal(tService);

    // it cannot reuse a nonce
    return expect(
      programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(
        16
      )}`
    );
  });

  it('cannot add a Service key with a wrong EcdsaSecp256k1RecoveryMethod2020 Key', async () => {
    const wrongEthKey = Wallet.createRandom();
    const tService = getTestService(3);

    return expect(
      service
        .addService(tService, false, nonAuthoritySigner.publicKey)
        .withEthSigner(wrongEthKey)
        .withPartialSigners(nonAuthoritySigner)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated'
    );
  });

  it('can use the new EcdsaSecp256k1RecoveryMethod2020 Key add another EcdsaSecp256k1VerificationKey2019 to the account', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    const keyData = Buffer.from(utils.arrayify(newEthKey2.publicKey).slice(1));

    // use transaction to test replay attack
    const transaction = await service
      .addVerificationMethod(
        {
          fragment: newEthKeyAlias2,
          keyData,
          methodType: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
          flags: [BitwiseVerificationMethodFlag.CapabilityInvocation],
        },
        nonAuthoritySigner.publicKey
      )
      .withEthSigner(newEthKey)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.nonce.toString()).to.be.equal(
      didDataAccountBefore.nonce.addn(1).toString()
    );
    expect(didDataAccount.verificationMethods.length).to.equal(4);
    expect(didDataAccount.verificationMethods[3].fragment).to.equal(
      newEthKeyAlias2
    );
    expect(didDataAccount.verificationMethods[3].keyData.length).to.equal(64);
    expect(didDataAccount.verificationMethods[3].keyData).to.deep.equal(
      keyData
    );
    expect(didDataAccount.verificationMethods[3].methodType).to.equal(
      VerificationMethodType.EcdsaSecp256k1VerificationKey2019
    );
    expect(didDataAccount.verificationMethods[3].flags.array).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
    ]);

    // it cannot reuse a nonce
    return expect(
      programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(
        16
      )}`
    );
  });

  it('can use the new EcdsaSecp256k1VerificationKey2019 Key add a Service to the account and not reuse nonce', async () => {
    const didDataAccountBefore = await service.getDidAccount();

    const tService = getTestService(4);

    // use transaction to test replay attack
    const transaction = await service
      .addService(tService, false, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey2)
      .transaction();

    await programProvider.sendAndConfirm(transaction, [nonAuthoritySigner]);

    const didDataAccount = await service.getDidAccount();

    expect(didDataAccount.services.length).to.equal(3);
    expect(didDataAccount.nonce.toString()).to.be.equal(
      didDataAccountBefore.nonce.addn(1).toString()
    );
    expect(didDataAccount.services[0]).to.deep.equal(tService);

    // it cannot reuse a nonce
    return expect(
      programProvider.sendAndConfirm(transaction, [nonAuthoritySigner])
    ).to.be.rejectedWith(
      `Error processing Instruction 0: custom program error: 0x${LangErrorCode.ConstraintRaw.toString(
        16
      )}`
    );
  });

  it('cannot update the flags of an unknown verification method', async () => {
    const unknownAlias = 'unknown-fragment';

    // use transaction to test replay attack
    return expect(
      service.setVerificationMethodFlags(unknownAlias, []).rpc()
    ).to.be.rejectedWith(
      'Error Code: VmFragmentNotFound. Error Number: 6000. Error Message: No VM with the given fragment exists.'
    );
  });

  it('can update the flags (without Ownership Proof) of a verification method with a different verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length;

    // Update with Wallet Key
    const newFlags = [
      BitwiseVerificationMethodFlag.Authentication,
      BitwiseVerificationMethodFlag.CapabilityInvocation,
    ];
    await service.setVerificationMethodFlags(newEthKeyAlias, newFlags).rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore);
    expect(didDataAccount.verificationMethods[2].fragment).to.equal(
      newEthKeyAlias
    );
    expect(didDataAccount.verificationMethods[2].flags.array).to.deep.equal(
      newFlags
    );
  });

  it('cannot update the flags (WITH Ownership Proof) of a verification method with a different verification method', async () => {
    const newFlags = [
      BitwiseVerificationMethodFlag.Authentication,
      BitwiseVerificationMethodFlag.OwnershipProof,
    ];
    return expect(
      service.setVerificationMethodFlags(newEthKeyAlias, newFlags).rpc()
    ).to.be.rejectedWith(
      'Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated.'
    );
  });

  it('cannot update the flags (WITH Protected Flag) of a verification method with a different verification method', async () => {
    const newFlags = [
      BitwiseVerificationMethodFlag.Authentication,
      BitwiseVerificationMethodFlag.Protected,
    ];
    return expect(
      service.setVerificationMethodFlags(newEthKeyAlias, newFlags).rpc()
    ).to.be.rejectedWith(
      'Error Code: ConstraintRaw. Error Number: 2003. Error Message: A raw constraint was violated.'
    );
  });

  it('can update the flags (WITH Ownership Proof) of a verification method with a same verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length;

    // Update with Wallet Key
    const newFlags = [
      BitwiseVerificationMethodFlag.Authentication,
      BitwiseVerificationMethodFlag.OwnershipProof,
    ];
    await service
      .setVerificationMethodFlags(
        newEthKeyAlias,
        newFlags,
        nonAuthoritySigner.publicKey
      )
      .withEthSigner(newEthKey)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods.length).to.equal(vmLengthBefore);
    expect(didDataAccount.verificationMethods[2].fragment).to.equal(
      newEthKeyAlias
    );
    expect(didDataAccount.verificationMethods[2].flags.array).to.deep.equal(
      newFlags
    );
  });

  it('cannot remove default verification method with protected flag set', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    expect(
      didDataAccountBefore.verificationMethods[0].flags.array
    ).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
      BitwiseVerificationMethodFlag.OwnershipProof,
      BitwiseVerificationMethodFlag.Protected,
    ]);

    return expect(
      service.removeVerificationMethod(DEFAULT_KEY_ID).rpc()
    ).to.be.rejectedWith(
      'Error Code: VmCannotRemoveProtected. Error Number: 6013.'
    );
  });

  it('successfully remove the Protected Flag from the DEFAULT verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    expect(
      didDataAccountBefore.verificationMethods[0].flags.array
    ).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
      BitwiseVerificationMethodFlag.OwnershipProof,
      BitwiseVerificationMethodFlag.Protected,
    ]);

    await service
      .setVerificationMethodFlags(DEFAULT_KEY_ID, [
        BitwiseVerificationMethodFlag.CapabilityInvocation,
        BitwiseVerificationMethodFlag.OwnershipProof,
      ])
      .rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods[0].flags.array).to.deep.equal([
      BitwiseVerificationMethodFlag.CapabilityInvocation,
      BitwiseVerificationMethodFlag.OwnershipProof,
    ]);
  });

  it('successfully set flags to 0 when removing the default verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    expect(
      didDataAccountBefore.verificationMethods[0].flags.array
    ).to.not.equal([]);

    await service.removeVerificationMethod(DEFAULT_KEY_ID).rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods[0].flags.array).to.deep.equal([]);
  });

  it('can remove a verification method with the same verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length;

    await service
      .removeVerificationMethod(newEthKeyAlias2, nonAuthoritySigner.publicKey)
      .withEthSigner(newEthKey2)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods.length).to.equal(
      vmLengthBefore - 1
    );
  });

  it('can remove a verification method with a different verification method', async () => {
    const didDataAccountBefore = await service.getDidAccount();
    const vmLengthBefore = didDataAccountBefore.verificationMethods.length;

    await service
      .removeVerificationMethod(newEthKeyAlias, newSolKey.publicKey)
      .withPartialSigners(newSolKey)
      .rpc();

    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.verificationMethods.length).to.equal(
      vmLengthBefore - 1
    );
  });

  it('cannot remove the last VM with a CapabilityInvocation', async () => {
    return expect(
      service
        .removeVerificationMethod(newSolKeyAlias, newSolKey.publicKey)
        .withPartialSigners(newSolKey)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmCannotRemoveLastAuthority. Error Number: 6003. ' +
        'Error Message: Removing the last verification method would lead to a lockout.'
    );
  });

  it('cannot update flags (without CapabilityInvocation) of the last VM with a CapabilityInvocation', async () => {
    return expect(
      service
        .setVerificationMethodFlags(newSolKeyAlias, [], newSolKey.publicKey)
        .withPartialSigners(newSolKey)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmCannotRemoveLastAuthority. Error Number: 6003. ' +
        'Error Message: Removing the last verification method would lead to a lockout.'
    );
  });

  it('cannot use update to remove all VerificationMethods with a CapabilityInvocation', async () => {
    return expect(
      service
        .update(
          {
            services: [],
            controllerDIDs: [],
            verificationMethods: [],
          },
          newSolKey.publicKey
        )
        .withPartialSigners(newSolKey)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmCannotRemoveLastAuthority. Error Number: 6003. ' +
        'Error Message: Removing the last verification method would lead to a lockout.'
    );
  });
});
