import { Program } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  findProgramAddress,
  DidSolService,
  DidSolIdentifier,
  VerificationMethodFlags,
  VerificationMethodType,
  LegacyClient,
} from '../dist/src/index';
import { SolDid } from '../dist/target/types/sol_did';

import { airdrop, getTestService } from '../tests/utils/utils';
import { getDerivationPath, MNEMONIC } from '../tests/fixtures/config';
import { TEST_CLUSTER } from '../tests/utils/const';

import { utils, Wallet } from 'ethers';
import { ExtendedCluster } from '@identity.com/sol-did-client-legacy/dist/lib/constants';
import { Keypair } from '@solana/web3.js';
import { promises as fsPromises } from 'fs';

const { exec } = require('child_process');

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

  const service = new DidSolService(
    program,
    authority.publicKey,
    didData,
    cluster,
    authority
  );

  const keyFileBuffer = await fsPromises.readFile(
    './tests/fixtures/LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a.json'
  );
  const privateKey = Uint8Array.from(JSON.parse(keyFileBuffer.toString()));
  const otherSolKey = Keypair.fromSecretKey(privateKey);
  await airdrop(
    programProvider.connection,
    otherSolKey.publicKey,
    100 * anchor.web3.LAMPORTS_PER_SOL
  );

  const ethKey = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());

  console.log('DidIdentifier: ' + authority.publicKey.toBase58());
  console.log('DidDataAccount: ' + didData.toBase58());

  console.log(`OtherSolKey: ${otherSolKey.publicKey.toBase58()}`);
  console.log(`EthKey: ${ethKey.address}`);

  // Init account

  await service.initialize().rpc();

  // write account
  exec(
    `solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-min.json --output json`
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
    otherSolKey.publicKey,
    TEST_CLUSTER
  ).toString();

  await service
    .setControllers([ethrDid, solDid])
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  // write account
  exec(
    `solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-complete.json --output json`
  );

  // Legacy DID Fixture
  // -----------------
  const legacyDid = await LegacyClient.register({
    payer: otherSolKey.secretKey,
    cluster: LegacyClient.ClusterType.development(),
    connection: programProvider.connection,
  });

  console.log(`Legacy DID: ${legacyDid}`);

  const tService2 = getTestService(784378);

  // add service
  await LegacyClient.addService({
    did: legacyDid,
    payer: otherSolKey.secretKey,
    service: {
      id: `${legacyDid}#${tService2.fragment}`,
      type: tService2.serviceType,
      serviceEndpoint: tService2.serviceEndpoint,
      description: `${tService2.fragment} description`,
    },
  });

  // add key
  await LegacyClient.addKey({
    payer: otherSolKey.secretKey,
    did: legacyDid,
    fragment: 'ledger',
    key: authority.publicKey.toBase58(),
  });

  // add controller
  await LegacyClient.addController({
    payer: otherSolKey.secretKey,
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
  exec(
    `solana account ${legacyAccount.toBase58()} -ul -o tests/fixtures/legacy-did-account-complete.json --output json`
  );

  // resolve:
  // const doc = await LegacyClient.resolve(legacyDid)
  // console.log(JSON.stringify(doc, null, 2))
})().catch(console.error);
