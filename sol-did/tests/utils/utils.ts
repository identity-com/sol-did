import * as anchor from '@project-serum/anchor';
import { web3 } from '@project-serum/anchor';

import {
  Service,
  BitwiseVerificationMethodFlag,
  VerificationMethodType,
  AddVerificationMethodParams,
} from '@identity.com/sol-did-client';
import { Keypair, PublicKey } from '@solana/web3.js';

export const checkConnectionLogs = (connection: web3.Connection) => {
  if (process.env.ENABLE_LOGS)
    connection.onLogs('all', (log) => console.log(log.logs));
};

export const airdrop = async (
  connection: web3.Connection,
  account: web3.PublicKey,
  amount = anchor.web3.LAMPORTS_PER_SOL
) => {
  const sigAirdrop = await connection.requestAirdrop(account, amount);
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature: sigAirdrop,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  });
};

export const getTestService = (n: number): Service => ({
  fragment: `test${n}`,
  serviceType: `testType${n}`,
  serviceEndpoint: `testEndpoint${n}`,
});

export const getTestVerificationMethod = (
  fragment: string,
  key: PublicKey = Keypair.generate().publicKey,
  flags: BitwiseVerificationMethodFlag[] = [
    BitwiseVerificationMethodFlag.CapabilityInvocation,
  ],
  methodType: VerificationMethodType = VerificationMethodType.Ed25519VerificationKey2018
): AddVerificationMethodParams => ({
  fragment,
  keyData: key.toBuffer(),
  methodType,
  flags,
});
