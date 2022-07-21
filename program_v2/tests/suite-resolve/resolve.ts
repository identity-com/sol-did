import * as anchor from '@project-serum/anchor';
import { Program, web3, Wallet } from '@project-serum/anchor';
import { SolDid } from '../../target/types/sol_did';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { before } from 'mocha';
import { DidSolService, findProgramAddress, VerificationMethodFlags, VerificationMethodType, DEFAULT_KEY_ID, DidSolIdentifier} from '../../src';

import {
  getGeneratedDidDocument,
  loadDidDocComplete,
  loadKeypair,
  loadLegacyDidDocComplete,
} from '../fixtures/loader';
import { TEST_CLUSTER } from '../utils/const';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { Wallet as wallet2 } from 'ethers';
import { airdrop, getTestService } from '../utils/utils';

chai.use(chaiAsPromised);

describe('sol-did resolve operations', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  let service: DidSolService;
  let legacyAuthority: Keypair;
  let legacyDidService: DidSolService;

  let didDocComplete: DIDDocument;
  let legacyDidDocComplete: DIDDocument;

  const newSolKey = anchor.web3.Keypair.generate();
  const newSolKeyAlias = 'new-sol-key';

  const solKey = anchor.web3.Keypair.generate();
  const ethKey = wallet2.createRandom();

  before(async () => {
    const [didData] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(
      program,
      authority.publicKey,
      didData,
      TEST_CLUSTER
    );

    legacyAuthority = await loadKeypair(
      'LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a.json'
    );
    await airdrop(
      programProvider.connection,
      legacyAuthority.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    const [legDidData] = await findProgramAddress(legacyAuthority.publicKey);
    legacyDidService = new DidSolService(
      program,
      legacyAuthority.publicKey,
      legDidData,
      TEST_CLUSTER,
      new Wallet(legacyAuthority)
    );

    didDocComplete = await loadDidDocComplete();
    legacyDidDocComplete = await loadLegacyDidDocComplete();
  });

  it('can successfully resolve a generative DID', async () => {
    const solKey = web3.Keypair.generate();
    const [solKeyData, _] = await findProgramAddress(solKey.publicKey);
    const localService = new DidSolService(
      program,
      solKey.publicKey,
      solKeyData,
      TEST_CLUSTER
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

  // TODO: Implement Migration Tests
  it.skip('can successfully migrate a legacy DID', async () => {
    // TODO: Frank test update in here.
    throw new Error('Not implemented');
  });

  it("can update the verificationMethods of a Did", async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [{
      fragment: newSolKeyAlias,
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, {
      fragment: 'new-key',
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityDelegation,
    }, 
    ]
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
  })

  it("cannot update the verificationMethods of a Did if there are replications", async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [{
      fragment: newSolKeyAlias,
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, {
      fragment: newSolKeyAlias,
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, {
      fragment: newSolKeyAlias,
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    },
    ]
    return expect(
      service
      .update({
        controllerDIDs: [],
        services: [],
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc())
      .to.be
      .rejectedWith("Error Code: VmFragmentAlreadyInUse. Error Number: 6001. Error Message: Given VM fragment is already in use.");
  })

  it("can update the services of a Did", async () => {
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
  })

  it("cannot update the services of a Did when there are duplicates", async () => {
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
      .rpc())
      .to.be.rejectedWith("Error Code: ServiceFragmentAlreadyInUse. Error Number: 6004. Error Message: Service already exists in current service list.");
  })

  it("can update controllers of a Did", async () => {
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
  })

  it("cannot update controllers when itself is added", async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    const ethrDid = `did:ethr:${ethKey.address}`;
    const selfSolDid = service.did;
    return expect(service
    .update({
      controllerDIDs: [selfSolDid, ethrDid],
      services: [],
      verificationMethods: [],
    })
    .withSolWallet(authority)
    .rpc()).to.be.rejectedWith("Error Code: InvalidNativeControllers. Error Number: 6007. Error Message: Invalid native controllers. Cannot set itself as a controller.")
  })

    it('fails to update the controller if it includes an invalid DID.', async () => {
    return expect(() =>
      service.update({
        controllerDIDs: [
        `did:ethr:${ethKey.address}`,
        DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
        'wrong-did',
      ],
      services: [],
      verificationMethods: []})
    ).to.be.throw('Invalid DID found in controllers');
  });

  it('can successfully update the state of a DID', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);
    let vms = [{
      fragment: newSolKeyAlias,
      keyData: newSolKey.publicKey.toBytes(),
      methodType: VerificationMethodType.Ed25519VerificationKey2018,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }, {
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
      }
    ]
    let services = [getTestService(5), getTestService(9)];
    const ethKey = wallet2.createRandom();
    const ethrDid = `did:ethr:${ethKey.address}`;
    // take values and manipulate
    // existing.verificationMethods...
    // call update with manipulated values
    const updated = await service
      .update({
        controllerDIDs: [ethrDid],
        services: services,
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc();
      let updated_account = await service.getDidAccount();
      expect(updated_account?.services.length == 2);
      expect (updated_account?.verificationMethods.length == 2);
  });

  it('prioritises the new resolver over the legacy resolver', async () => {
    await legacyDidService.initialize().rpc();

    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(
      getGeneratedDidDocument(
        legacyAuthority.publicKey.toBase58(),
        'did:sol:localnet:'
      )
    );
  });
});
