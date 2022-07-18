import { Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { SolDid } from "../dist/target/types/sol_did";
import { findProgramAddress } from "../src/lib/utils";
import { airdrop, getTestService } from "../tests/utils/utils";
import { utils, Wallet } from "ethers";
import { DidSolService, VerificationMethodFlags, VerificationMethodType } from "../dist/src";
import { getDerivationPath, MNEMONIC } from "../tests/fixtures/config";
import { ExtendedCluster } from "@identity.com/sol-did-client-legacy/dist/lib/constants";
import { INITIAL_MIN_ACCOUNT_SIZE } from "../dist/src/lib/const";
import { DidSolIdentifier } from "../src";
import { TEST_CLUSTER } from "../tests/utils/const";
import { Keypair } from "@solana/web3.js";
import { promises as fsPromises } from "fs";

const { exec } = require("child_process");

// TODO: nothing should be imported from `/test`

(async () => {
  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const [didData, _] = await findProgramAddress(authority.publicKey);

  await airdrop(programProvider.connection, authority.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);

  const cluster: ExtendedCluster = "localnet";

  const service = new DidSolService(
    program,
    authority.publicKey,
    didData,
    cluster,
    authority
  );

  const keyFileBuffer = await fsPromises.readFile("./tests/fixtures/LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a.json");
  const privateKey = Uint8Array.from(JSON.parse(keyFileBuffer.toString()));

  const solKey = Keypair.fromSecretKey(privateKey);
  const ethKey = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());

  console.log("DidIdentifier: " + authority.publicKey.toBase58());
  console.log("DidDataAccount: " + didData.toBase58());

  console.log(`SolKey: ${solKey.publicKey.toBase58()}`);
  console.log(`EthKey: ${ethKey.address}`);

  // Init account

  await service.initialize(INITIAL_MIN_ACCOUNT_SIZE).rpc();

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-min.json --output json`);

  const DEFAULT_ACCOUNT_SIZE = 10_000;

  await service.resize(DEFAULT_ACCOUNT_SIZE, authority.publicKey).rpc();

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account.json --output json`);

  // Multiple Verification Methods to fixture
  const ethAuthority0 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());
  const ethAuthority0AddressAsBytes = utils.arrayify(ethAuthority0.address)

  await service.addVerificationMethod(
    {
      alias: "eth-address",
      keyData: Buffer.from(ethAuthority0AddressAsBytes),
      methodType: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }).rpc();


  const ethAuthority1 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(1));
  await service.addVerificationMethod(
    {
      alias: "eth-key",
      keyData: Buffer.from(utils.arrayify(ethAuthority1.publicKey).slice(1)),
      methodType: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
      flags: VerificationMethodFlags.CapabilityInvocation,
    }).rpc();

  const tService = getTestService(871438247)
  await service.addService(tService).rpc();

  const ethrDid = `did:ethr:${ethKey.address}`;
  const solDid = DidSolIdentifier.create(solKey.publicKey, TEST_CLUSTER).toString();

  await service.setControllers(
    [
      ethrDid,
      solDid,
    ])
    .rpc()

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-complete.json --output json`);


  // const [_, derivedPass] = await service.derivePass([constituentPass], {
  //   expireOnUse: true,
  //   expireDuration: 365 * 24 * 60 * 60, // expires in 1 year - an expireOnUse token must have some expiry time already set
  //   refreshDisabled: true,
  // });
  //
  // console.log("Authority: " + provider.wallet.publicKey.toBase58());
  // console.log("DidDoc: " + JSON.stringify(didDoc, null, 2));
})().catch(console.error);
