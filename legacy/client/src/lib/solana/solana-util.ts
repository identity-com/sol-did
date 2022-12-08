import {
  Connection,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { SOLANA_COMMITMENT } from '../constants';

export class SolanaUtil {
  static sendAndConfirmTransaction(
    connection: Connection,
    transaction: Transaction,
    ...signers: Array<Keypair>
  ): Promise<TransactionSignature> {
    return sendAndConfirmTransaction(connection, transaction, signers, {
      skipPreflight: false,
      commitment: SOLANA_COMMITMENT,
      preflightCommitment: 'recent',
    });
  }

  static async newAccountWithLamports(
    connection: Connection,
    lamports = LAMPORTS_PER_SOL
  ): Promise<Keypair> {
    const account = Keypair.generate();

    let retries = 30;
    await connection.requestAirdrop(account.publicKey, lamports);
    for (;;) {
      await this.sleep(500);
      const balance = await connection.getBalance(account.publicKey);
      if (lamports <= balance) {
        return account;
      }
      if (--retries <= 0) {
        break;
      }
    }
    throw new Error(`Airdrop of ${lamports} failed`);
  }

  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
