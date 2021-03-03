import {
  Account,
  Connection,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

export class SolanaUtil {
  static sendAndConfirmTransaction(
    connection: Connection,
    transaction: Transaction,
    ...signers: Array<Account>
  ): Promise<TransactionSignature> {
    return sendAndConfirmTransaction(connection, transaction, signers, {
      skipPreflight: false,
      commitment: 'recent',
      preflightCommitment: 'recent',
    });
  }

  static async newAccountWithLamports(
    connection: Connection,
    lamports: number = 1000000
  ): Promise<Account> {
    const account = new Account();

    let retries = 30;
    await connection.requestAirdrop(account.publicKey, lamports);
    for (;;) {
      await this.sleep(500);
      if (lamports === (await connection.getBalance(account.publicKey))) {
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
