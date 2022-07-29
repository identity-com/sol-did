import { Program } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  findProgramAddress,
  DidSolService,
  DidSolIdentifier,
  VerificationMethodFlags,
  VerificationMethodType,
  LegacyClient,
  LEGACY_DID_SOL_PROGRAM,
  DID_SOL_PROGRAM,
} from '../dist/src/index';
import { SolDid } from '../dist/target/types/sol_did';

import { airdrop, getTestService } from '../tests/utils/utils';
import { getDerivationPath, MNEMONIC } from '../tests/fixtures/config';
import { TEST_CLUSTER } from '../tests/utils/const';

import { utils, Wallet } from 'ethers';
import { ExtendedCluster } from '@identity.com/sol-did-client-legacy/dist/lib/constants';
import { Keypair, PublicKey } from '@solana/web3.js';

import { loadKeypair } from '../tests/fixtures/loader';

import { exec as execCB } from 'child_process';
import * as util from 'util';
const exec = util.promisify(execCB);

const fixturePath = './tests/fixtures/accounts/';

//copied from anchor
export async function idlAddress(programId: PublicKey): Promise<PublicKey> {
  const base = (await PublicKey.findProgramAddress([], programId))[0];
  return await PublicKey.createWithSeed(base, 'anchor:idl', programId);
}

(async () => {
  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const [didData, _] = await findProgramAddress(authority.publicKey);

  await airdrop(
    programProvider.connection,
    authority.publicKey,
    100 * anchor.web3.LAMPORTS_PER_SOL
  );

  const cluster: ExtendedCluster = 'localnet';

  const service = await DidSolService.buildFromAnchor(
    program,
    authority.publicKey,
    cluster,
    programProvider
  );

  const legacyDidKey = await loadKeypair(
    'LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a.json'
  );
  const wrongOwnerDidKey = await loadKeypair(
    'AEG4pGqjnBhGVty9W2u2WSCuzNhAjDwAShHp6rcs1KXh.json'
  );

  await airdrop(
    programProvider.connection,
    legacyDidKey.publicKey,
    100 * anchor.web3.LAMPORTS_PER_SOL
  );

  await airdrop(
    programProvider.connection,
    wrongOwnerDidKey.publicKey,
    100 * anchor.web3.LAMPORTS_PER_SOL
  );

  const ethKey = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());

  console.log('DidIdentifier: ' + authority.publicKey.toBase58());
  console.log('DidDataAccount: ' + didData.toBase58());

  console.log(`LegacyDidKey: ${legacyDidKey.publicKey.toBase58()}`);
  console.log(`EthKey: ${ethKey.address}`);
  console.log(`WrongOwnerDidKey: ${wrongOwnerDidKey.publicKey.toBase58()}`);

  // Init account

  await service.initialize().rpc();

  // write account
  await exec(
    `solana account ${didData.toBase58()} -ul -o ${fixturePath}did-account-min.json --output json`
  );

  // Multiple Verification Methods to fixture
  const ethAuthority0 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());
  const ethAuthority0AddressAsBytes = utils.arrayify(ethAuthority0.address);

  await service
    .addVerificationMethod({
      fragment: 'eth-address',
      keyData: Buffer.from(ethAuthority0AddressAsBytes),
      methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: VerificationMethodFlags.CapabilityInvocation,
    })
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  const ethAuthority1 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(1));
  await service
    .addVerificationMethod({
      fragment: 'eth-key',
      keyData: Buffer.from(utils.arrayify(ethAuthority1.publicKey).slice(1)),
      methodType: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
      flags: VerificationMethodFlags.CapabilityInvocation,
    })
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  const tService = getTestService(871438247);
  await service
    .addService(tService)
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  const ethrDid = `did:ethr:${ethKey.address}`;
  const solDid = DidSolIdentifier.create(
    legacyDidKey.publicKey,
    TEST_CLUSTER
  ).toString();

  await service
    .setControllers([ethrDid, solDid])
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  // write account
  await exec(
    `solana account ${didData.toBase58()} -ul -o ${fixturePath}did-account-complete.json --output json`
  );

  // Legacy DID Fixture
  // -----------------
  const legacyDid = await LegacyClient.register({
    payer: legacyDidKey.secretKey,
    cluster: LegacyClient.ClusterType.development(),
    connection: programProvider.connection,
  });

  console.log(`Legacy DID: ${legacyDid}`);

  const tService2 = getTestService(784378);

  // add service
  await LegacyClient.addService({
    did: legacyDid,
    payer: legacyDidKey.secretKey,
    service: {
      id: `${legacyDid}#${tService2.fragment}`,
      type: tService2.serviceType,
      serviceEndpoint: tService2.serviceEndpoint,
      description: `${tService2.fragment} description`,
    },
  });

  // add key
  await LegacyClient.addKey({
    payer: legacyDidKey.secretKey,
    did: legacyDid,
    fragment: 'ledger',
    key: authority.publicKey.toBase58(),
  });

  // add controller
  await LegacyClient.addController({
    payer: legacyDidKey.secretKey,
    did: legacyDid,
    controller: DidSolIdentifier.create(
      authority.publicKey,
      cluster
    ).toString(),
  });

  // get account
  const legacyAccount = await LegacyClient.DecentralizedIdentifier.parse(
    legacyDid
  ).pdaSolanaPubkey();
  // write account
  await exec(
    `solana account ${legacyAccount.toBase58()} -ul -o ${fixturePath}legacy-did-account-complete.json --output json`
  );

  // Legacy DID Fixture
  // -----------------
  const unsupportedDid = await LegacyClient.register({
    payer: wrongOwnerDidKey.secretKey,
    cluster: LegacyClient.ClusterType.development(),
    connection: programProvider.connection,
  });

  // get account
  const unsupportedAccount = await LegacyClient.DecentralizedIdentifier.parse(
    unsupportedDid
  ).pdaSolanaPubkey();
  // write account
  await exec(
    `solana account ${unsupportedAccount.toBase58()} -ul -o ${fixturePath}legacy-did-account-wrong-owner.json --output json`
  );

  // Change Owner to random wrong one. (May only work with POSIX sed)
  await exec(
    `sed -i '' "s/${LEGACY_DID_SOL_PROGRAM.toBase58()}/${Keypair.generate().publicKey.toBase58()}/g" ${fixturePath}legacy-did-account-wrong-owner.json`
  );

  console.log('Deploying IDL');
  // Deploy IDL
  await exec(
    `anchor idl init --filepath ./target/idl/sol_did.json ${DID_SOL_PROGRAM}`
  );

  console.log('Done deploying IDL');

  // write account
  const idlAddr = await idlAddress(DID_SOL_PROGRAM);
  await exec(
    `solana account ${idlAddr.toBase58()} -ul -o ${fixturePath}idl-account.json --output json`
  );

  // resolve:
  // const doc = await LegacyClient.resolve(legacyDid)
  // console.log(JSON.stringify(doc, null, 2))
})().catch(console.error);
