import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  ExtendedCluster,
} from '@identity.com/sol-did-client';
import { clusterApiUrl, Commitment, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor";
import { airdrop } from "../../tests/utils/utils";
import { Wallet as EthWallet } from "@ethersproject/wallet";


// ADAPT THESE
const cluster: ExtendedCluster = 'devnet';
const commitment: Commitment = 'processed';
const authorityPrivateKey = [64,229,207,4,231,106,115,210,155,115,65,93,130,223,100,36,115,141,52,123,165,105,130,23,179,84,133,224,84,60,61,133,165,59,190,8,186,207,63,178,80,33,174,75,156,218,139,59,12,200,147,165,168,122,205,98,218,168,107,57,215,203,0,42];
const newEthPrivateKey = "a863adc3fa27c59978c24d094bc91b08050ece520653a1466af417e856edc4b3";
// const nonAuthorityKey = Keypair.generate();

const setup = async () => {
  // SETUP Part
  const connection = new Connection(clusterApiUrl(cluster));
  const authority = Keypair.fromSecretKey(Uint8Array.from(authorityPrivateKey))

  const accountInfo = await connection.getAccountInfo(authority.publicKey, commitment)
  if (!accountInfo || accountInfo.lamports < LAMPORTS_PER_SOL/10) {
    await airdrop(
      connection,
      authority.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
  }

  const didIdentifier = DidSolIdentifier.create(authority.publicKey, cluster);

  // non-authoritive wallet
  const nonAuthority = Keypair.generate();
  await airdrop(
    connection,
    nonAuthority.publicKey,
    1 * anchor.web3.LAMPORTS_PER_SOL
  );
  const wallet = new Wallet(nonAuthority)
  const service = DidSolService.build(didIdentifier, {
    connection,
    wallet,
    confirmOptions: {
      commitment,
    }
  });

  return {
    connection,
    wallet,
    didIdentifier,
    authority,
    service,
  }
}

(async () => {

  const { wallet, service } = await setup();

  // Add new Key
  const ethWallet = new EthWallet(newEthPrivateKey);

  const sig = await service.setVerificationMethodFlags(
    'new-eth-key',
    [ BitwiseVerificationMethodFlag.CapabilityInvocation, BitwiseVerificationMethodFlag.Authentication, BitwiseVerificationMethodFlag.Assertion, BitwiseVerificationMethodFlag.OwnershipProof]
  )
    .withAutomaticAlloc(wallet.publicKey)
    .withEthSigner(ethWallet)
    .rpc()

  console.log(`Successfully added new service.`);
  console.log(`Signature: ${sig}`);

})().catch(console.error);
