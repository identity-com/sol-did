import * as anchor from '@project-serum/anchor';
import { Program, web3, Wallet } from '@project-serum/anchor';
import { SolDid } from '../../target/types/sol_did';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { before } from 'mocha';
import { DidSolService } from '../../src';

import {
  getGeneratedDidDocument,
  loadJSON,
  loadKeypair,
} from '../fixtures/loader';
import { TEST_CLUSTER } from '../utils/const';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { airdrop } from '../utils/utils';

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

  it('can successfully update the state of a DID', async () => {
    const existing = await service.getDidAccount();
    expect(existing).to.not.be.equal(null);

    // take values and manipulate
    // existing.verificationMethods...

    // call update with manipulated values
    const updated = await service
      .update({
        nativeControllers: [],
        otherControllers: [],
        services: [],
        verificationMethods: [],
      })
      .withSolWallet(authority)
      .rpc();
  });
});
