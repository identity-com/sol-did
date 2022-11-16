import {
  BitwiseVerificationMethodFlag,
  DidSolIdentifier,
  DidSolService,
  ExtendedCluster,
  VerificationMethodType,
} from '@identity.com/sol-did-client';
import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Wallet } from '@project-serum/anchor';
import { airdrop } from '../../tests/utils/utils';
import * as anchor from '@project-serum/anchor';

// ADAPT THESE
const cluster: ExtendedCluster = 'devnet';
const commitment: Commitment = 'processed';
const authorityPrivateKey = [
  64, 229, 207, 4, 231, 106, 115, 210, 155, 115, 65, 93, 130, 223, 100, 36, 115,
  141, 52, 123, 165, 105, 130, 23, 179, 84, 133, 224, 84, 60, 61, 133, 165, 59,
  190, 8, 186, 207, 63, 178, 80, 33, 174, 75, 156, 218, 139, 59, 12, 200, 147,
  165, 168, 122, 205, 98, 218, 168, 107, 57, 215, 203, 0, 42,
];
const newKeyPrivateKey = [
  10, 131, 56, 82, 11, 227, 33, 197, 195, 34, 181, 176, 159, 28, 228, 230, 64,
  190, 100, 109, 173, 211, 128, 42, 163, 157, 53, 207, 11, 144, 199, 61, 56,
  232, 119, 218, 42, 110, 158, 125, 114, 72, 190, 173, 159, 49, 99, 161, 31,
  109, 48, 6, 193, 249, 156, 45, 164, 190, 37, 21, 3, 126, 82, 54,
];
const controllers = [
  'did:sov:CYQLsccvwhMTowprMjGjQ6',
  DidSolIdentifier.create(Keypair.generate().publicKey, cluster).toString(),
];

const setup = async () => {
  // SETUP Part
  const connection = new Connection(clusterApiUrl(cluster));
  const authority = Keypair.fromSecretKey(Uint8Array.from(authorityPrivateKey));

  const accountInfo = await connection.getAccountInfo(
    authority.publicKey,
    commitment
  );
  if (!accountInfo || accountInfo.lamports < LAMPORTS_PER_SOL / 10) {
    await airdrop(
      connection,
      authority.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
  }

  const didIdentifier = DidSolIdentifier.create(authority.publicKey, cluster);

  const wallet = new Wallet(authority);
  const service = DidSolService.build(didIdentifier, {
    connection,
    wallet,
    confirmOptions: {
      commitment,
    },
  });

  return {
    connection,
    wallet,
    didIdentifier,
    authority,
    service,
  };
};

(async () => {
  const { authority, service } = await setup();

  // Add new Key
  const newKey = Keypair.fromSecretKey(Uint8Array.from(newKeyPrivateKey));

  const sig = await service
    .setControllers(controllers)
    .withAutomaticAlloc(authority.publicKey)
    .rpc();

  console.log(`Successfully added new key: ${newKey.publicKey.toBase58()}`);
  console.log(`Signature: ${sig}`);
})().catch(console.error);
