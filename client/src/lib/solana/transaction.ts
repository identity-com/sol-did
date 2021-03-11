import { ClusterType, SolidData } from './solid-data';
import { SolanaUtil } from './solana-util';
import {
  closeAccount,
  getKeyFromAuthority,
  initialize,
  write,
} from './instruction';
import { Account, Connection, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { MergeBehaviour } from '../util';

export class SolidTransaction {
  static async createSolid(
    connection: Connection,
    payer: Account,
    authority: PublicKey,
    clusterType: ClusterType,
    initData: SolidData
  ): Promise<PublicKey> {
    const solidKey = await getKeyFromAuthority(authority);

    // Allocate memory for the account
    const transaction = new Transaction().add(
      initialize(payer.publicKey, solidKey, authority, clusterType, initData)
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

  static async deactivateSolid(
    connection: Connection,
    payer: Account,
    recordKey: PublicKey
  ): Promise<string> {
    // Create the transaction to close the Solid DID account
    // The payer must have permissions to deactivate the DID
    // The payer receives the lamports stored in the DID account
    const transaction = new Transaction().add(
      closeAccount(recordKey, payer.publicKey, payer.publicKey)
    );

    // Send the instructions
    return SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer);
  }

  static async updateSolid(
    connection: Connection,
    payer: Account,
    recordKey: PublicKey,
    dataToMerge: SolidData,
    mergeBehaviour: MergeBehaviour
  ): Promise<string> {
    // Update the solid DID
    const existingData = await this.getSolid(connection, recordKey);

    if (!existingData) throw new Error('DID does not exist');

    const mergedData = existingData.merge(
      dataToMerge,
      mergeBehaviour === 'Overwrite'
    );

    const transaction = new Transaction().add(
      write(recordKey, payer.publicKey, new BN(0), mergedData.encode())
    );

    // Send the instructions
    return SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer);
  }
}
