import * as anchor from '@project-serum/anchor';
import { Program, Wallet, web3 } from '@project-serum/anchor';
import { SolDid } from '@identity.com/sol-did-idl';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { before } from 'mocha';
import {
  DidSolDocument,
  DidSolIdentifier,
  DidSolService,
  BitwiseVerificationMethodFlag,
  VerificationMethodType,
  AddVerificationMethodParams,
  DidAccountSizeHelper,
  LegacyClient,
} from '@identity.com/sol-did-client';

import {
  getGeneratedDidDocument,
  loadJSON,
  loadKeypair,
} from '../fixtures/loader';
import { TEST_CLUSTER } from '../utils/const';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { Wallet as EtherWallet } from 'ethers';
import {
  airdrop,
  existingAccount,
  getTestService,
  getTestVerificationMethod,
} from '../utils/utils';
import { DEFAULT_KEY_ID } from '@identity.com/sol-did-client-legacy';
import * as crypto from 'crypto';

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

  const solKey = anchor.web3.Keypair.generate();
  const ethKey = EtherWallet.createRandom();

  before(async () => {
    service = await DidSolService.buildFromAnchor(
      program,
      DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER),
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
      DidSolIdentifier.create(legacyAuthority.publicKey, TEST_CLUSTER),
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
      DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER),
      programProvider
    );

    const didDoc = await localService.resolve();
    expect(didDoc).to.deep.equal(
      getGeneratedDidDocument(solKey.publicKey.toBase58(), 'did:sol:localnet:')
    );
  });

  it('can successfully resolve a generative DID if the PDA has a balance.', async () => {
    const solKey = web3.Keypair.generate();
    const localService = await DidSolService.buildFromAnchor(
      program,
      DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER),
      programProvider
    );

    await airdrop(programProvider.connection, localService.didDataAccount);

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

  it('cannot chain operations after migrate that increase the existing size', async () => {
    return expect(
      legacyDidService
        .migrate(nonAuthoritySigner.publicKey)
        .addService(getTestService(1))
        // .withSolWallet(nonAuthorityWallet)
        .withAutomaticAlloc(nonAuthoritySigner.publicKey)
        .withPartialSigners(nonAuthoritySigner)
        .rpc()
    ).to.be.rejectedWith('Init instruction already set.');
  });

  it('can successfully migrate a legacy DID and chain commands that do not increase size', async () => {
    const existing = await legacyDidService.getDidAccount();
    expect(existing).to.be.null;

    expect(await legacyDidService.isMigratable()).to.be.true;

    // migrate
    await legacyDidService
      .migrate(nonAuthoritySigner.publicKey)
      .removeService('test784378')
      .removeVerificationMethod('ledger')
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    // check migration
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(
      Object.assign({}, migratedLegacyDidDocComplete, {
        capabilityInvocation:
          migratedLegacyDidDocComplete.capabilityInvocation.filter(
            (x: string) => !x.endsWith('ledger')
          ),
        verificationMethod:
          migratedLegacyDidDocComplete.verificationMethod.filter(
            (vm) => !vm.id.endsWith('#ledger')
          ),
        service: migratedLegacyDidDocComplete.service.filter(
          (s) => !s.id.endsWith('#test784378')
        ),
      })
    );

    // check that auth
    const didAccount = await legacyDidService.getDidAccount();
    expect(didAccount.verificationMethods[0].flags.raw).to.equal(
      BitwiseVerificationMethodFlag.OwnershipProof |
        BitwiseVerificationMethodFlag.CapabilityInvocation
    );

    // close migration again for next test
    await legacyDidService.close(authority.publicKey).rpc();
  });

  it('can successfully migrate a legacy DID resize the account up and add content', async () => {
    const existing = await legacyDidService.getDidAccount();
    expect(existing).to.be.null;

    expect(await legacyDidService.isMigratable()).to.be.true;

    const randomString = crypto.randomBytes(123).toString('hex');
    // migrate
    await legacyDidService
      .migrate(nonAuthoritySigner.publicKey)
      .resize(500)
      .addService({
        fragment: 'big-service',
        serviceType: 'BigService',
        serviceEndpoint: randomString,
      })
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    // check migration
    const [didAccount, didAccountSize] =
      await legacyDidService.getDidAccountWithSize();
    expect(didAccount.services[0].serviceEndpoint).to.equal(randomString);

    expect(
      new DidAccountSizeHelper(didAccount.raw).getDidAccountSize()
    ).to.equal(490);
    expect(didAccountSize).to.equal(500);

    // close migration again for next test
    await legacyDidService.close(authority.publicKey).rpc();
  });

  it('can successfully migrate a legacy DID with a nonAuthority signer', async () => {
    const existing = await legacyDidService.getDidAccount();
    expect(existing).to.be.null;

    expect(await legacyDidService.isMigratable()).to.be.true;

    // migrate
    await legacyDidService
      .migrate(nonAuthoritySigner.publicKey)
      .withSolWallet(nonAuthorityWallet)
      .rpc();

    // check migration
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(migratedLegacyDidDocComplete);

    // check that auth
    const didAccount = await legacyDidService.getDidAccount();
    expect(didAccount.verificationMethods[0].flags.raw).to.equal(
      BitwiseVerificationMethodFlag.OwnershipProof |
        BitwiseVerificationMethodFlag.CapabilityInvocation
    );
  });

  it('cannot migrate if a new account already exists', async () => {
    expect(await legacyDidService.isMigratable()).to.be.false;
    return expect(legacyDidService.migrate().rpc()).to.be.rejectedWith(
      'Error processing Instruction 0: custom program error: 0x0'
    );
  });

  it('cannot migrate if a legacy account does not exist', async () => {
    expect(await service.isMigratable()).to.be.false;
    return expect(service.migrate().rpc()).to.be.rejectedWith(
      'legacy_did_data. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized'
    );
  });

  it('calling migrate on a generative DID fails with error', async () => {
    expect(await service.isMigratable()).to.be.false;

    const solKey = web3.Keypair.generate();
    const identifier = DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER);
    const genDidService = await DidSolService.build(identifier);

    return expect(
      genDidService
        .migrate(nonAuthoritySigner.publicKey)
        .withSolWallet(nonAuthorityWallet)
        .rpc()
    ).to.be.rejectedWith(
      'legacy_did_data. Error Code: AccountNotInitialized. Error Number: 3012. Error Message: The program expected this account to be already initialized'
    );
  });

  it('can successfully migrate a legacy DID and close the legacy account', async () => {
    // close migrated account from previous test
    await legacyDidService.close(authority.publicKey).rpc();
    const didAccount = await legacyDidService.getDidAccount();
    const legacyAccount = await legacyDidService.getLegacyData();
    expect(didAccount).to.be.null;

    // why is this failing? Version update? This broke after "@solana/web3.js went to 1.50.1 in yarn.lock
    // expect(legacyAccount.authority.toPublicKey()).to.deep.equal(
    //   legacyAuthority.publicKey
    // );
    // replacement check
    expect(legacyAccount.authority.toPublicKey().toBase58()).to.equal(
      legacyAuthority.publicKey.toBase58()
    );

    expect(await legacyDidService.isMigratable()).to.be.true;

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
      DidSolIdentifier.create(
        wrongOwnerLegacyAuthority.publicKey,
        TEST_CLUSTER
      ),
      programProvider,
      new Wallet(wrongOwnerLegacyAuthority)
    );

    expect(await wrongOwnerService.isMigratable()).to.be.true;

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
    await existingAccount(service);
    let vms: AddVerificationMethodParams[] = [
      getTestVerificationMethod('key1', Keypair.generate().publicKey, [
        BitwiseVerificationMethodFlag.KeyAgreement,
        BitwiseVerificationMethodFlag.CapabilityInvocation,
      ]),
      getTestVerificationMethod('key2'),
      getTestVerificationMethod('key3', Keypair.generate().publicKey, [
        BitwiseVerificationMethodFlag.KeyAgreement,
        BitwiseVerificationMethodFlag.CapabilityInvocation,
        BitwiseVerificationMethodFlag.CapabilityDelegation,
      ]),
      getTestVerificationMethod(
        DEFAULT_KEY_ID,
        Keypair.generate().publicKey,
        [
          BitwiseVerificationMethodFlag.Authentication,
          BitwiseVerificationMethodFlag.KeyAgreement,
          BitwiseVerificationMethodFlag.CapabilityInvocation,
        ],
        VerificationMethodType.EcdsaSecp256k1VerificationKey2019
      ), // Intentionally wrong
    ];
    await service
      .update({
        controllerDIDs: [],
        services: [],
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services).to.be.deep.equal([]);

    // Default Element will not be updated on verificationMethods
    const lastElement = vms.pop();
    // Default (Initial) Verification Method will ONLY update the flags
    expect(updated_account?.verificationMethods[0].fragment).to.be.equal(
      DEFAULT_KEY_ID
    );
    expect(
      updated_account?.verificationMethods[0].flags.array
    ).to.be.deep.equal(lastElement.flags);
    expect(updated_account?.verificationMethods[0].keyData).to.be.deep.equal(
      authority.publicKey.toBytes()
    );
    expect(updated_account?.verificationMethods[0].methodType).to.be.equal(
      VerificationMethodType.Ed25519VerificationKey2018
    );

    expect(
      updated_account?.verificationMethods.slice(1).map((vm) => vm.toParams())
    ).to.be.deep.equal(vms); // default key will not be updated
    expect(updated_account?.controllers).to.be.deep.equal([]);
  });

  it('cannot update the verificationMethods of a Did if there are replications', async () => {
    await existingAccount(service);
    let vms = [
      getTestVerificationMethod('key1'),
      getTestVerificationMethod('key2'),
      getTestVerificationMethod('key3'),
      getTestVerificationMethod('key1'),
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
    await existingAccount(service);
    let services = [getTestService(5), getTestService(9)];
    await service
      .update({
        controllerDIDs: [],
        services: services,
        verificationMethods: [],
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services).to.be.deep.equal(services);
    expect(updated_account?.verificationMethods.slice(1)).to.be.deep.equal([]);
    expect(updated_account?.controllers).to.be.deep.equal([]);
  });

  it('cannot update the services of a Did when there are duplicates', async () => {
    await existingAccount(service);
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
    await existingAccount(service);
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(
      solKey.publicKey,
      TEST_CLUSTER
    ).toString();

    await service
      .update({
        controllerDIDs: [solDid, ethrDid],
        services: [],
        verificationMethods: [],
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services).to.be.deep.equal([]);
    expect(updated_account?.verificationMethods.slice(1)).to.be.deep.equal([]);
    expect(updated_account?.controllers).to.be.deep.equal([
      DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
      ethrDid,
    ]);
  });

  it('cannot update controllers when itself is added', async () => {
    await existingAccount(service);
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
    await existingAccount(service);
    let vms = [
      getTestVerificationMethod('key1'),
      getTestVerificationMethod('key2'),
    ];
    let services = [getTestService(5), getTestService(9)];
    const ethKey = EtherWallet.createRandom();
    const ethrDid = `did:ethr:${ethKey.address}`;
    await service
      .update({
        controllerDIDs: [ethrDid],
        services: services,
        verificationMethods: vms,
      })
      .withSolWallet(authority)
      .rpc();
    let updated_account = await service.getDidAccount();
    expect(updated_account?.services).to.be.deep.equal(services);
    expect(
      updated_account?.verificationMethods.slice(1).map((vm) => vm.toParams())
    ).to.be.deep.equal(vms);
    expect(updated_account?.controllers).to.be.deep.equal([ethrDid]);
  });

  it('fails to update when any verification methods try to set the Ownership flag.', async () => {
    await existingAccount(service);
    let vms = [
      getTestVerificationMethod('key1'),
      getTestVerificationMethod('key2', Keypair.generate().publicKey, [
        BitwiseVerificationMethodFlag.CapabilityInvocation,
        BitwiseVerificationMethodFlag.OwnershipProof,
      ]),
      getTestVerificationMethod('key3'),
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
      'Error Code: VmOwnershipOnAdd. Error Number: 6002. Error Message: Cannot add a verification method with OwnershipProof flag.'
    );
  });

  it('can update a did:sol with a DID Document', async () => {
    // close and update the legacy account
    await legacyDidService.close(legacyAuthority.publicKey).rpc();
    expect(await legacyDidService.getDidAccount()).to.be.null;

    const document = DidSolDocument.fromDoc(migratedLegacyDidDocComplete);
    // recreate legacyDidService with update
    await legacyDidService
      .updateFromDoc(document)
      .withAutomaticAlloc(legacyAuthority.publicKey)
      .rpc();

    // check migration
    const didDoc = await legacyDidService.resolve();
    expect(didDoc).to.deep.equal(migratedLegacyDidDocComplete);
  });

  describe('migrate', () => {
    let authority: Keypair;
    let identifier: DidSolIdentifier;
    let service: DidSolService;

    before(async () => {
      authority = Keypair.generate();
      identifier = DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER);
      await airdrop(
        programProvider.connection,
        authority.publicKey,
        5 * LAMPORTS_PER_SOL
      );

      // create legacy account
      await LegacyClient.register({
        payer: authority.secretKey, // payer == owner
        cluster: LegacyClient.ClusterType.development(),
        connection: programProvider.connection,
      });

      service = await DidSolService.build(identifier, {
        connection: programProvider.connection,
        wallet: new Wallet(authority),
        confirmOptions: programProvider.opts,
      });
    });

    it('can migrating a DID with inferred capability invocation', async () => {
      // create a legacy did with inferred capability invocation
      const legacyData = await service.getLegacyData();
      expect(legacyData).to.not.be.null;
      expect(legacyData?.capabilityInvocation).to.deep.equal([]); // inferred case.

      // migrate and close legacy account
      await service.migrate(authority.publicKey, authority.publicKey).rpc();

      expect(await service.getLegacyData()).to.be.null;

      const doc = await service.resolve();
      const data = await service.getDidAccount();
      expect(doc.capabilityInvocation).to.deep.equal([
        `${identifier.toString()}#${DEFAULT_KEY_ID}`,
      ]);

      expect(data?.verificationMethods[0].flags.array).to.deep.equal([
        BitwiseVerificationMethodFlag.CapabilityInvocation,
        BitwiseVerificationMethodFlag.OwnershipProof,
      ]);
    });
  });
});
