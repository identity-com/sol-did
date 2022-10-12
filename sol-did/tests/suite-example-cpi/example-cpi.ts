import * as anchor from '@project-serum/anchor';
import { AnchorProvider, Program, Wallet } from '@project-serum/anchor';
import { SolDid, Example } from '@identity.com/sol-did-idl';
import {
  DidSolIdentifier,
  DidSolService,
  findProgramAddress,
} from '@identity.com/sol-did-client';
import { before } from 'mocha';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { expect } from 'chai';
import { TEST_CLUSTER } from '../utils/const';
import { airdrop } from '../utils/utils';

chai.use(chaiAsPromised);

export const createTestContext = () => {
  const envProvider = anchor.AnchorProvider.env();
  const keypair = anchor.web3.Keypair.generate();
  const anchorProvider = new AnchorProvider(
    envProvider.connection,
    new anchor.Wallet(keypair),
    envProvider.opts
  );

  const exampleEnvProgram = anchor.workspace.Example as Program<Example>;
  const solDidEnvProgram = anchor.workspace.SolDid as Program<SolDid>;

  const solDidProgram = new Program<SolDid>(
    solDidEnvProgram.idl,
    solDidEnvProgram.programId,
    anchorProvider
  );
  const exampleProgram = new Program<SolDid>(
    exampleEnvProgram.idl,
    exampleEnvProgram.programId,
    anchorProvider
  );
  const provider = exampleProgram.provider as anchor.AnchorProvider;
  const authority = provider.wallet;

  return {
    solDidProgram,
    exampleProgram,
    provider,
    authority,
    keypair,
  };
};
//
// let exampleProgram: Program<Example>;
// let solDidProgram: Program<SolDid>;
// let provider: AnchorProvider;
// let authority: typeof AnchorProvider.prototype.wallet;

describe('sol-did example cpi', () => {
  const { solDidProgram, exampleProgram, provider, authority } =
    createTestContext();

  let didData, didDataPDABump;

  before(async () => {
    [didData, didDataPDABump] = findProgramAddress(authority.publicKey);
    await airdrop(provider.connection, authority.publicKey);
  });

  it('create and add a service via CPI', async () => {
    await exampleProgram.methods
      .initialize(1024)
      .accounts({
        didData,
        authority: authority.publicKey,
        payer: authority.publicKey,
        solDidProgram: solDidProgram.programId,
      })
      .rpc();

    await exampleProgram.methods
      .addService('my_data', 'metadata', 'https://test.test/abc')
      .accounts({
        didData,
        authority: authority.publicKey,
        solDidProgram: solDidProgram.programId,
      })
      .rpc();

    const service = await DidSolService.buildFromAnchor(
      solDidProgram,
      DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER),
      provider
    );
    const didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(1);
  });
});
