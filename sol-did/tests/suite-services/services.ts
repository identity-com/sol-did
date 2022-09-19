import * as anchor from '@project-serum/anchor';
import { Program, Wallet } from '@project-serum/anchor';
import { SolDid } from '@identity.com/sol-did-idl';
import {
  DidSolIdentifier,
  DidSolService,
  findProgramAddress,
  DidSolDataAccount,
} from '@identity.com/sol-did-client';
import { before } from 'mocha';
import { airdrop, getTestService } from '../utils/utils';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { expect } from 'chai';
import { TEST_CLUSTER } from '../utils/const';
import { getDerivationPath, MNEMONIC } from '../fixtures/config';
import { Wallet as EtherWallet } from 'ethers';

chai.use(chaiAsPromised);

describe('sol-did service operations', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  let didData, didDataPDABump;
  let service: DidSolService;

  let didDataAccount: DidSolDataAccount;

  const ethAuthority0 = EtherWallet.fromMnemonic(
    MNEMONIC,
    getDerivationPath(0)
  );
  const ethAuthority1 = EtherWallet.fromMnemonic(
    MNEMONIC,
    getDerivationPath(1)
  );

  const nonAuthoritySigner = anchor.web3.Keypair.generate();
  const nonAuthorityWallet = new Wallet(nonAuthoritySigner);

  const authority = programProvider.wallet;

  before(async () => {
    [didData, didDataPDABump] = findProgramAddress(authority.publicKey);
    service = await DidSolService.buildFromAnchor(
      program,
      DidSolIdentifier.create(authority.publicKey, TEST_CLUSTER),
      programProvider
    );

    await airdrop(programProvider.connection, nonAuthoritySigner.publicKey);

    didDataAccount = await service.getDidAccount();
  });

  //add data
  it('add a new service to the data.services', async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(1);
    await service
      .addService(tService)
      .withAutomaticAlloc(authority.publicKey)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore + 1);
  });

  //add service with the same key, expect an error to pass the test
  it('should fail to add service with the same ID', async () => {
    const tService = getTestService(1);
    tService.serviceEndpoint = 'serviceEndpoint2'; // change to change payload

    return expect(service.addService(tService).rpc()).to.be.rejectedWith(
      'Error Code: ServiceFragmentAlreadyInUse. Error Number: 6004. Error Message: Service already exists in current service list.'
    );
  });

  it('should allow to add service with the same ID if allowOverwrite is true', async () => {
    const serviceLengthBefore = didDataAccount.services.length;
    const sizeBefore = (await service.getDidAccountWithSize())[1];

    const tService = getTestService(1);
    const updated = '-updated';
    tService.serviceEndpoint = `${tService.serviceEndpoint}${updated}`;

    await service
      .addService(tService, true)
      .withAutomaticAlloc(authority.publicKey)
      .rpc();

    let sizeAfter;
    [didDataAccount, sizeAfter] = await service.getDidAccountWithSize();

    expect(didDataAccount.services.length).to.equal(serviceLengthBefore);
    expect(didDataAccount.services[0]).to.deep.equal(tService);
    expect(sizeAfter).to.equal(sizeBefore + updated.length);
  });

  // delete a service
  it('can successfully delete a service', async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(1);
    await service.removeService(tService.fragment).rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore - 1);
  });

  // delete a service that doesn't exist, expect an error to pass the test.
  it('should fail to delete non-existing service', async () => {
    return expect(
      service.removeService('non-existing-service-id').rpc()
    ).to.be.rejectedWith(
      "Error Code: ServiceFragmentNotFound. Error Number: 6005. Error Message: Service doesn't exists in current service list."
    );
  });

  it('add a new service to the data.services with an ethereum key', async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(10000); // requires more size
    await service
      .addService(tService, false, nonAuthoritySigner.publicKey)
      .withEthSigner(ethAuthority0)
      .withSolWallet(nonAuthorityWallet)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore + 1);
  });

  it('can successfully delete a service with an ethereum key', async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService = getTestService(10000);
    await service
      .removeService(tService.fragment, nonAuthoritySigner.publicKey)
      .withEthSigner(ethAuthority1)
      .withSolWallet(nonAuthorityWallet)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore - 1);
  });

  it('add multiple new services to the data.services with an ethereum key and autoalloc', async () => {
    const serviceLengthBefore = didDataAccount.services.length;

    const tService3 = getTestService(3);
    const tService4 = getTestService(4);
    const tService5 = getTestService(5);
    await service
      .addService(tService3, false, nonAuthoritySigner.publicKey)
      .addService(tService4, false, nonAuthoritySigner.publicKey)
      .addService(tService5, false, nonAuthoritySigner.publicKey)
      .withEthSigner(ethAuthority1)
      .withSolWallet(nonAuthorityWallet)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .rpc();

    didDataAccount = await service.getDidAccount();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore + 3);
  });

  it('does not resize the account if more is added than removed.', async () => {
    const serviceLengthBefore = didDataAccount.services.length;
    const sizeBefore = (await service.getDidAccountWithSize())[1];

    const tService4 = getTestService(4);
    const tService5 = getTestService(5);
    const tService6 = getTestService(6);

    tService5.serviceEndpoint = tService5.serviceEndpoint.substring(1); // remove 1 char

    await service
      .removeService(tService4.fragment, nonAuthoritySigner.publicKey) // remove
      .addService(tService5, true, nonAuthoritySigner.publicKey) // update
      .addService(tService6, false, nonAuthoritySigner.publicKey) // add
      .withEthSigner(ethAuthority1)
      .withSolWallet(nonAuthorityWallet)
      .withAutomaticAlloc(nonAuthoritySigner.publicKey)
      .rpc();

    let sizeAfter;
    [didDataAccount, sizeAfter] = await service.getDidAccountWithSize();
    expect(didDataAccount.services.length).to.equal(serviceLengthBefore);
    expect(didDataAccount.services[1]).to.deep.equal(tService5);
    expect(didDataAccount.services[0]).to.deep.equal(tService6);

    expect(sizeAfter).to.equal(sizeBefore);
  });
});
