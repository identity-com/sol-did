import { ClusterType, SolidData } from './solid-data';
import { SolanaUtil } from './solana-util';
import { initialize, getKeyFromAuthority } from './instruction';
import { Account, Connection, PublicKey, Transaction } from '@solana/web3.js';

export class SolidTransaction {
  static SOLID_SEED: string = 'solid';

  static async createSolid(
    connection: Connection,
    payer: Account,
    authority: PublicKey,
    clusterType: ClusterType
  ): Promise<PublicKey> {
    const solidKey = await getKeyFromAuthority(authority);

    // Allocate memory for the account
    const transaction = new Transaction().add(
      initialize(payer.publicKey, solidKey, authority, clusterType)
    );

    // Send the instructions
    await SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer);
    return solidKey;
  }

  static async getSolid(
    connection: Connection,
    recordKey: PublicKey
  ): Promise<SolidData | null> {
    const data = await connection.getAccountInfo(recordKey);
    return data ? SolidData.decode(data.data) : null;
  }

  static async getSolidFromAuthority(
    connection: Connection,
    authority: PublicKey
  ): Promise<SolidData | null> {
    const recordKey = await getKeyFromAuthority(authority);
    return SolidTransaction.getSolid(connection, recordKey);
  }
}
