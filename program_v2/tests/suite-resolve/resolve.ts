import * as anchor from '@project-serum/anchor';
import { Program, web3, Wallet } from '@project-serum/anchor';
import { SolDid } from '../../target/types/sol_did';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { before } from 'mocha';
import {
  DidSolService,
  findProgramAddress,
  VerificationMethodFlags,
  VerificationMethodType,
  DEFAULT_KEY_ID,
  DidSolIdentifier,
} from '../../src';


import {
  getGeneratedDidDocument,
  loadJSON,
  loadKeypair,
} from '../fixtures/loader';
import { TEST_CLUSTER } from '../utils/const';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { Wallet as wallet2 } from 'ethers';
import { airdrop, getTestService } from '../utils/utils';

chai.use(chaiAsPromised);

describe('sol-did resolve and migrate operations', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  let service: DidSolService;
  let legacyAuthority: Keypair;
  let legacyDidService: DidSolService;

  let wrongOwnerLegacyAuthority: Keypair;

  let didDocComplete: DIDDocument;
  let legacyDidDocComplete: DIDDocument;
  let migratedLegacyDidDocComplete: DIDDocument;

  const nonAuthoritySigner = anchor.web3.Keypair.generate();
  const nonAuthorityWallet = new Wallet(nonAuthoritySigner);

  const newSolKey = anchor.web3.Keypair.generate();
  const newSolKeyAlias = 'new-sol-key';

  const solKey = anchor.web3.Keypair.generate();
  const ethKey = wallet2.createRandom();

  before(async () => {
    service = await DidSolService.buildFromAnchor(
      program,
      authority.publicKey,
      TEST_CLUSTER,
      programProvider
    );

    legacyAuthority = await loadKeypair(
      'LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a.json'
    );

    wrongOwnerLegacyAuthority = await loadKeypair(
      'AEG4pGqjnBhGVty9W2u2WSCuzNhAjDwAShHp6rcs1KXh.json'
    );

    await airdrop(
      programProvider.connection,
      legacyAuthority.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    legacyDidService = await DidSolService.buildFromAnchor(
      program,
      legacyAuthority.publicKey,
      TEST_CLUSTER,
      programProvider,
      new Wallet(legacyAuthority)
    );

    didDocComplete = (await loadJSON(
      'did-document-complete.json'
    )) as DIDDocument;
    legacyDidDocComplete = (await loadJSON(
      'legacy-did-document-complete.json'
    )) as DIDDocument;
    migratedLegacyDidDocComplete = (await loadJSON(
      'legacy-did-document-complete-migrated.json'
    )) as DIDDocument;

    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);
  });

  it('can successfully resolve a generative DID', async () => {
    const solKey = web3.Keypair.generate();
    const localService = await DidSolService.buildFromAnchor(
      program,
      solKey.publicKey,
      TEST_CLUSTER,
      programProvider
    );

    const didDoc = await localService.resolve();
    expect(didDoc).to.deep.equal(
      getGeneratedDidDocument(solKey.publicKey.toBase58(), 'did:sol:localnet:')
    );
  });

  it('can successfully resolve a DID', async () => {
    const didDoc = await service.resolve();
    expect(didDoc).to.deep.equal(didDocComplete);
  });

  it('can successfully resolve a legacy DID', async () => {
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(legacyDidDocComplete);
  });

  it('can successfully migrate a legacy DID with a nonAuthority signer', async () => {
    const existing = await legacyDidService.getDidAccount();
    expect(existing).to.be.null;

    // migrate
    await legacyDidService
      .migrate(nonAuthoritySigner.publicKey)
      .withSolWallet(nonAuthorityWallet)
      .rpc();

    // check migration
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(migratedLegacyDidDocComplete);
  });

  it('cannot migrate if a new account already exists', async () => {
    return expect(legacyDidService.migrate().rpc()).to.be.rejectedWith(
      'Error processing Instruction 0: custom program error: 0x0'
    );
  });

  it('cannot migrate if a legacy account does not exist', async () => {
    return expect(service.migrate().rpc()).to.be.rejectedWith(
      'legacy_did_data. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized'
    );
  });

  it('can successfully migrate a legacy DID and close the legacy account', async () => {
    // close migrated account from previous test
    await legacyDidService.close(authority.publicKey).rpc();
    const didAccount = await legacyDidService.getDidAccount();
    const legacyAccount = await legacyDidService.getLegacyData();
    expect(didAccount).to.be.null;
    expect(legacyAccount.authority.toPublicKey()).to.deep.equal(
      legacyAuthority.publicKey
    );

    // migrate
    await legacyDidService
      .migrate(nonAuthoritySigner.publicKey, legacyAuthority.publicKey)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    // check migration
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(migratedLegacyDidDocComplete);

    // check legacy is closed
    const legacyData = await service.getLegacyData();
    expect(legacyData).to.be.null;
  });

  it('cannot migrate if the account is not owned by the legacy did:sol program', async () => {
    const wrongOwnerService = await DidSolService.buildFromAnchor(
      program,
      wrongOwnerLegacyAuthority.publicKey,
      TEST_CLUSTER,
      programProvider,
      new Wallet(wrongOwnerLegacyAuthority)
    );

    return expect(
      wrongOwnerService
        .migrate(nonAuthoritySigner.publicKey)
        .withSolWallet(nonAuthorityWallet)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: AccountOwnedByWrongProgram. Error Number: 3007. Error Message: The given account is owned by a different program than expected.'
    );
  });

  it('can update the verificationMethods of a Did', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: 'new-key',
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityDelegation,
      },
    ];
    const updated = await service
      .update({
        controllerDIDs: [],
        services: [],
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services.length).to.equal(0);
    expect(updated_account?.verificationMethods.length).to.equal(2);
    expect(updated_account?.nativeControllers.length).to.equal(0);
    expect(updated_account?.otherControllers.length).to.equal(0);
  });

  it('cannot update the verificationMethods of a Did if there are replications', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
    ];
    return expect(
      service
        .update({
          controllerDIDs: [],
          services: [],
          verificationMethods: vms,
        })
        .withSolWallet(authority)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmFragmentAlreadyInUse. Error Number: 6001. Error Message: Given VM fragment is already in use.'
    );
  });

  it('can update the services of a Did', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let services = [getTestService(5), getTestService(9)];
    const updated = await service
      .update({
        controllerDIDs: [],
        services: services,
        verificationMethods: [],
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services.length).to.equal(2);
    expect(updated_account?.verificationMethods.length).to.equal(0);
    expect(updated_account?.nativeControllers.length).to.equal(0);
    expect(updated_account?.otherControllers.length).to.equal(0);
  });

  it('cannot update the services of a Did when there are duplicates', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let services = [getTestService(5), getTestService(5)];
    return expect(
      service
        .update({
          controllerDIDs: [],
          services: services,
          verificationMethods: [],
        })
        .withSolWallet(authority)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: ServiceFragmentAlreadyInUse. Error Number: 6004. Error Message: Service already exists in current service list.'
    );
  });

  it('can update controllers of a Did', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(
      solKey.publicKey,
      TEST_CLUSTER
    ).toString();
    const updated = await service
      .update({
        controllerDIDs: [solDid, ethrDid],
        services: [],
        verificationMethods: [],
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services.length).to.equal(0);
    expect(updated_account?.verificationMethods.length).to.equal(0);
    expect(updated_account?.nativeControllers.length).to.equal(1);
    expect(updated_account?.otherControllers.length).to.equal(1);
  });

  it('cannot update controllers when itself is added', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    const ethrDid = `did:ethr:${ethKey.address}`;
    const selfSolDid = service.did;
    return expect(
      service
        .update({
          controllerDIDs: [selfSolDid, ethrDid],
          services: [],
          verificationMethods: [],
        })
        .withSolWallet(authority)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: InvalidNativeControllers. Error Number: 6007. Error Message: Invalid native controllers. Cannot set itself as a controller.'
    );
  });

  it('fails to update the controller if it includes an invalid DID.', async () => {
    return expect(() =>
      service.update({
        controllerDIDs: [
          `did:ethr:${ethKey.address}`,
          DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
          'wrong-did',
        ],
        services: [],
        verificationMethods: [],
      })
    ).to.be.throw('Invalid DID found in controllers');
  });

  it('can successfully update the state of a DID', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: 'new-key',
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityDelegation,
      },
      {
        fragment: DEFAULT_KEY_ID,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
    ];
    let services = [getTestService(5), getTestService(9)];
    const ethKey = wallet2.createRandom();
    const ethrDid = `did:ethr:${ethKey.address}`;
    const updated = await service
      .update({
        controllerDIDs: [ethrDid],
        services: services,
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services.length).to.equal(2);
    expect(updated_account?.verificationMethods.length).to.equal(2);
    expect(updated_account?.nativeControllers.length).to.equal(0);
    expect(updated_account?.otherControllers.length).to.equal(1);
  });

  it('check set_service works before set_verification_methods', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
    ];
    let services = [getTestService(5), getTestService(5)];
    return expect(
      service
        .update({
          controllerDIDs: [],
          services: services,
          verificationMethods: vms,
        })
        .withSolWallet(authority)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: ServiceFragmentAlreadyInUse. Error Number: 6004. Error Message: Service already exists in current service list.'
    );
  });

  it('check set_verification_methods works before set_controllers', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
      {
        fragment: newSolKeyAlias,
        keyData: newSolKey.publicKey.toBytes(),
        methodType: VerificationMethodType.Ed25519VerificationKey2018,
        flags: VerificationMethodFlags.CapabilityInvocation,
      },
    ];
    const ethrDid = `did:ethr:${ethKey.address}`;
    const selfSolDid = service.did;
    return expect(
      service
        .update({
          controllerDIDs: [ethrDid, selfSolDid],
          services: [],
          verificationMethods: vms,
        })
        .withSolWallet(authority)
        .rpc()
    ).to.be.rejectedWith(
      'Error Code: VmFragmentAlreadyInUse. Error Number: 6001. Error Message: Given VM fragment is already in use.'
    );
  });
});
