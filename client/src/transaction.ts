import { SolidData } from './solid-data';
import { SolanaUtil } from './solana-util';
import { PROGRAM_ID, initialize } from './instruction';
import { Account, Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

export class SolidTransaction {
  static async createSolid(connection: Connection, payer: Account, authority: Account): Promise<Account> {
    const solidKey = new Account();

    // Allocate memory for the account
    const solidSize = SolidData.size();
    const balanceNeeded = await connection.getMinimumBalanceForRentExemption(solidSize);
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: solidKey.publicKey,
        lamports: balanceNeeded,
        space: solidSize,
        programId: PROGRAM_ID,
      }),
    );

    transaction.add(initialize(solidKey.publicKey, authority.publicKey));

    // Send the instructions
    await SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer, solidKey);
    return solidKey;
  }

  static async getSolid(connection: Connection, recordKey: PublicKey): Promise<SolidData | null> {
    const data = await connection.getAccountInfo(recordKey);
    return data ? SolidData.decode(data.data) : null;
  }
}
