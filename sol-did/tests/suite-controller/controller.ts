import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { SolDid } from '@identity.com/sol-did-idl';
import {
  DidSolIdentifier,
  DidSolService,
  findProgramAddress,
  DidSolDataAccount,
} from '@identity.com/sol-did-client';
import { before } from 'mocha';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { expect } from 'chai';
import { TEST_CLUSTER } from '../utils/const';
import { Wallet } from 'ethers';
import { getDerivationPath, MNEMONIC } from '../fixtures/config';

chai.use(chaiAsPromised);

describe('sol-did controller operations', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  const authority = programProvider.wallet;

  let didDataAccount: DidSolDataAccount;

  const nonAuthoritySigner = anchor.web3.Keypair.generate();
  const ethAuthority = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(0));

  const solKey = anchor.web3.Keypair.generate();
  const ethKey = Wallet.createRandom();

  before(async () => {
    [didData, didDataPDABump] = findProgramAddress(authority.publicKey);
    service = await DidSolService.buildFromAnchor(
      program,
      DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER),
      programProvider
    );

    didDataAccount = await service.getDidAccount();
  });

  it('fails to update the controller if it includes an invalid DID.', async () => {
    return expect(() =>
      service.setControllers([
        `did:ethr:${ethKey.address}`,
        DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
        'wrong-did',
      ])
    ).to.be.throw('Invalid DID found in controllers');
  });

  it('can update the controllers of a DID.', async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(
      solKey.publicKey,
      TEST_CLUSTER
    ).toString();

    await service
      .setControllers([ethrDid, solDid])
      .withAutomaticAlloc(authority.publicKey)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.controllers).to.deep.equal([
      DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
      ethrDid,
    ]);
  });

  it('can update the controllers of a DID and successfully filters duplicates', async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const solDid = DidSolIdentifier.create(
      solKey.publicKey,
      TEST_CLUSTER
    ).toString();

    await service
      .setControllers([ethrDid, solDid, ethrDid, solDid, ethrDid, solDid])
      .withAutomaticAlloc(authority.publicKey)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.controllers).to.deep.equal([
      DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString(),
      ethrDid,
    ]);
  });

  it('cannot add itself as a controller', async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;
    const selfSolDid = service.did;

    return expect(
      service.setControllers([ethrDid, selfSolDid]).rpc()
    ).to.be.rejectedWith(
      'Error Code: InvalidNativeControllers. Error Number: 6007. Error Message: Invalid native controllers. Cannot set itself as a controller.'
    );
  });

  it('can add update the controllers of a DID and sign with an Ethereum Key', async () => {
    const ethrDid = `did:ethr:${ethKey.address}`;

    await service
      .setControllers([ethrDid], nonAuthoritySigner.publicKey)
      .withAutomaticAlloc(authority.publicKey)
      .withEthSigner(ethAuthority)
      .withPartialSigners(nonAuthoritySigner)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.controllers).to.deep.equal([ethrDid]);
  });
});
