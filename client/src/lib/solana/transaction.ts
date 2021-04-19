import { ClusterType, SolData } from './sol-data';
import { SolanaUtil } from './solana-util';
import {
  closeAccount,
  getKeyFromAuthority,
  initialize,
  write,
} from './instruction';
import { Account, Connection, PublicKey, Transaction } from '@solana/web3.js';
import { MergeBehaviour } from '../util';

export class SolTransaction {
  static async createSol(
    connection: Connection,
    payer: Account,
    authority: PublicKey,
    size: number,
    initData: SolData
  ): Promise<PublicKey> {
    const solKey = await getKeyFromAuthority(authority);

    // Allocate memory for the account
    const transaction = new Transaction().add(
      initialize(payer.publicKey, solKey, authority, size, initData)
    );

    // Send the instructions
    await SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer);
    return solKey;
  }

  static async getSol(
    connection: Connection,
    clusterType: ClusterType,
    recordKey: PublicKey
  ): Promise<SolData | null> {
    const data = await connection.getAccountInfo(recordKey);

    if (!data) return null;

    return SolData.fromAccount(recordKey, data.data, clusterType);
  }

  static async getSolFromAuthority(
    connection: Connection,
    clusterType: ClusterType,
    authority: PublicKey
  ): Promise<SolData | null> {
    const recordKey = await getKeyFromAuthority(authority);
    return SolTransaction.getSol(connection, clusterType, recordKey);
  }

  /**
   * Create and send an instruction to deactivate the DID
   * @param connection A connection to the blockchain
   * @param payer The payer of the transaction - this account also receives the lamports stored
   * @param recordKey
   * @param owner
   */
  static async deactivateSol(
    connection: Connection,
    payer: Account,
    recordKey: PublicKey,
    owner: Account = payer
  ): Promise<string> {
    // Create the transaction to close the Sol DID account
    // The payer must have permissions to deactivate the DID
    // The payer receives the lamports stored in the DID account
    const transaction = new Transaction().add(
      closeAccount(recordKey, owner.publicKey, payer.publicKey)
    );

    // Send the instructions
    return SolanaUtil.sendAndConfirmTransaction(
      connection,
      transaction,
      payer,
      owner
    );
  }

  static async updateSol(
    connection: Connection,
    clusterType: ClusterType,
    payer: Account,
    recordKey: PublicKey,
    dataToMerge: SolData,
    mergeBehaviour: MergeBehaviour,
    owner: Account = payer
  ): Promise<string> {
    // Update the sol DID
    const existingData = await this.getSol(connection, clusterType, recordKey);

    if (!existingData) throw new Error('DID does not exist');

    const mergedData = existingData.merge(
      dataToMerge,
      mergeBehaviour === 'Overwrite'
    );

    const transaction = new Transaction().add(
      write(recordKey, owner.publicKey, 0, mergedData.encode())
    );

    // Send the instructions
    return SolanaUtil.sendAndConfirmTransaction(
      connection,
      transaction,
      payer,
      owner
    );
  }
}
