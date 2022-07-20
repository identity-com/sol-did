import * as anchor from '@project-serum/anchor';
import { Program, web3, Wallet } from '@project-serum/anchor';
import { SolDid } from '../../target/types/sol_did';

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { before } from 'mocha';
import { DidSolService, findProgramAddress } from '../../src';

import {
  getGeneratedDidDocument,
  loadDidDocComplete,
  loadKeypair,
  loadLegacyDidDocComplete,
} from '../fixtures/loader';
import { TEST_CLUSTER } from '../utils/const';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import { airdrop } from '../utils/utils';

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
