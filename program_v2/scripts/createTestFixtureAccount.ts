import { Program } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { SolDid } from "../dist/target/types/sol_did";
import { findProgramAddress, INITIAL_MIN_ACCOUNT_SIZE } from "../src/lib/utils";
import { Transaction } from "@solana/web3.js";
import { airdrop, getTestService } from "../tests/utils/utils";
import { utils, Wallet } from "ethers";
import { DidSolService, VerificationMethodFlags, VerificationMethodType } from "../dist/src";
import { getDerivationPath, MNEMONIC } from "../tests/fixtures/config";

const { exec } = require("child_process");

(async () => {
  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  const [didData, _] = await findProgramAddress(authority.publicKey);

  await airdrop(programProvider.connection, authority.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL);

  const service = new DidSolService(
    program,
    authority.publicKey,
    didData,
    programProvider
  );

  console.log("DidIdentifier: " + authority.publicKey.toBase58());
  console.log("DidDataAccount: " + didData.toBase58());

  // Init account

  let instruction = await service.initialize(INITIAL_MIN_ACCOUNT_SIZE);
  let tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account-min.json --output json`);

  const DEFAULT_ACCOUNT_SIZE = 10_000;

  instruction = await service.resize(DEFAULT_ACCOUNT_SIZE, authority.publicKey);
  tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)

  // write account
  exec(`solana account ${didData.toBase58()} -ul -o tests/fixtures/did-account.json --output json`);

  // Multiple Verification Methods to fixture
  const ethAuthority0 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath());
  const ethAuthority0AddressAsBytes = utils.arrayify(ethAuthority0.address)

  instruction = await service.addVerificationMethod(
    {
      alias: "eth-address",
      keyData: Buffer.from(ethAuthority0AddressAsBytes),
      type: VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020,
      flags: VerificationMethodFlags.CapabilityInvocation,
    });
  tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)


  const ethAuthority1 = Wallet.fromMnemonic(MNEMONIC, getDerivationPath(1));
  instruction = await service.addVerificationMethod(
    {
      alias: "eth-key",
      keyData: Buffer.from(utils.arrayify(ethAuthority1.publicKey).slice(1)),
      type: VerificationMethodType.EcdsaSecp256k1VerificationKey2019,
      flags: VerificationMethodFlags.CapabilityInvocation,
    });
  tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)

  const tService = getTestService(871438247)
  instruction = await service.addService(tService);
  tx = new Transaction().add(instruction);
  await programProvider.sendAndConfirm(tx)

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
