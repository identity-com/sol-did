import { ClusterType, SolData, getPDAKeyFromAuthority } from './sol-data';
import { SolanaUtil } from './solana-util';
import { closeAccount, initialize, resize, write } from './instruction';
import {
  Keypair,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { MergeBehaviour } from '../util';

export class SolTransaction {
  static async createDIDInstruction(
    payer: PublicKey,
    authority: PublicKey,
    size: number,
    initData: SolData
  ): Promise<[TransactionInstruction, PublicKey]> {
    const solKey = await getPDAKeyFromAuthority(authority);
    return [initialize(payer, solKey, authority, size, initData), solKey];
  }

  static async createDID(
    connection: Connection,
    payer: Keypair,
    authority: PublicKey,
    size: number,
    initData: SolData
  ): Promise<void> {
    const solKey = await getPDAKeyFromAuthority(authority);

    // Allocate memory for the account
    const transaction = new Transaction().add(
      initialize(payer.publicKey, solKey, authority, size, initData)
    );

    // Send the instructions
    await SolanaUtil.sendAndConfirmTransaction(connection, transaction, payer);
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
    const recordKey = await getPDAKeyFromAuthority(authority);
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
    payer: Keypair,
    recordKey: PublicKey,
    owner: Keypair = payer
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

  static async resizeAccount(
    connection: Connection,
    payer: Keypair,
    recordKey: PublicKey,
    size: number,
    updateData: SolData,
    owner: Keypair = payer
  ): Promise<void> {
    // Allocate new memory for the account
    const transaction = new Transaction().add(
      resize(payer.publicKey, recordKey, owner.publicKey, size, updateData)
    );

    // Send the instructions
    await SolanaUtil.sendAndConfirmTransaction(
      connection,
      transaction,
      payer,
      owner
    );
  }

  static async deactivateDIDInstruction(
    recordKey: PublicKey,
    authority: PublicKey
  ): Promise<TransactionInstruction> {
    return closeAccount(recordKey, authority, authority);
  }

  static async updateDIDInstruction(
    connection: Connection,
    clusterType: ClusterType,
    recordKey: PublicKey,
    authority: PublicKey,
    dataToMerge: SolData,
    mergeBehaviour: MergeBehaviour
  ): Promise<TransactionInstruction> {
    const existingData = await this.getSol(connection, clusterType, recordKey);

    if (!existingData) throw new Error('DID does not exist');

    const mergedData = existingData.merge(
      dataToMerge,
      mergeBehaviour === 'Overwrite'
    );
    return write(recordKey, authority, 0, mergedData.encode());
  }

  static async updateDID(
    connection: Connection,
    clusterType: ClusterType,
    payer: Keypair,
    recordKey: PublicKey,
    dataToMerge: SolData,
    mergeBehaviour: MergeBehaviour,
    owner: Keypair = payer
  ): Promise<string> {
    const instruction = await this.updateDIDInstruction(
      connection,
      clusterType,
      recordKey,
      owner.publicKey,
      dataToMerge,
      mergeBehaviour
    );
    const transaction = new Transaction().add(instruction);

    // Send the instructions
    return SolanaUtil.sendAndConfirmTransaction(
      connection,
      transaction,
      payer,
      owner
    );
  }
}
