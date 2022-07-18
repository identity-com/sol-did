import { SolDid } from "../target/types/sol_did";
import { AnchorProvider, BN, Idl, parseIdlErrors, Program, translateError } from "@project-serum/anchor";

import {
  ethSignPayload,
  fetchProgram,
  findProgramAddress, validateAndSplitControllers,
} from "./lib/utils";
import {
  Commitment,
  ConfirmOptions,
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import { DIDDocument } from "did-resolver";
import { DidDataAccount, EthSigner, Service, VerificationMethod, VerificationMethodFlags, Wallet } from "./lib/types";
import { INITIAL_MIN_ACCOUNT_SIZE, SOLANA_COMMITMENT } from "./lib/const";
import { DidSolDocument } from "./DidSolDocument";
import { ExtendedCluster, getConnectionByCluster } from "./lib/connection";
import { DidSolIdentifier } from "./DidSolIdentifier";
import {
  ClusterType,
  DecentralizedIdentifier,
  SolPublicKey,
} from '@identity.com/sol-did-client-legacy';
import { SolTransaction } from "@identity.com/sol-did-client-legacy";


/**
 * The DidSolService class is a wrapper around the Solana DID program.
 * It provides methods for creating, reading, updating, and deleting DID documents.
 * Note, the provider or connection in the DidSolService MUST not be used for tx submissions.
 * Please use DidSolServiceBuilder instead
 */
export class DidSolService {
  private identifier: DidSolIdentifier;

  static async build(
    didIdentifier: PublicKey,
    cluster: ExtendedCluster,
    preflightCommitment: Commitment = SOLANA_COMMITMENT,
  ): Promise<DidSolService> {

    const connection = getConnectionByCluster(cluster, preflightCommitment);
    // Note, DidSolService never signs, so provider does not need a valid Wallet or confirmOptions.
    const provider = new AnchorProvider(connection, new DummyWallet(), AnchorProvider.defaultOptions());

    const program = await fetchProgram(provider);
    const [didDataAccount, _] = await findProgramAddress(didIdentifier);

    return new DidSolService(
      program,
      didIdentifier,
      didDataAccount,
      cluster,
      provider.wallet,
      provider.opts);
  }

  constructor(
    private program: Program<SolDid>,
    private didAuthority: PublicKey,
    private didDataAccount: PublicKey,
    private cluster: ExtendedCluster = 'mainnet-beta',
    private wallet: Wallet = new DummyWallet(),
    private opts: ConfirmOptions = AnchorProvider.defaultOptions(),
  ) {
    this.identifier = DidSolIdentifier.create(didAuthority, cluster);
  }

  async getDidAccount(): Promise<DidDataAccount|null> {
    return await this.program.account.didAccount.fetchNullable(this.didDataAccount) as DidDataAccount
  }

  get did(): string {
    return this.identifier.toString();
  }

  getIdl(): Idl {
    return this.program.idl;
  }

  async getNonce(): Promise<BN> {
    const account = await this.program.account.didAccount.fetchNullable(this.didDataAccount)
    return account ? account.nonce : new BN(0);
  }

  getWallet(): Wallet {
    return this.wallet;
  }

  getConnection(): Connection {
    return this.program.provider.connection;
  }

  getConfrirmOptions(): ConfirmOptions {
    return this.opts;
  }

  /**
   * Initializes the did:sol account.
   * Does **not** support ethSignInstruction
   * @param size
   */
  initialize(size: number | null = INITIAL_MIN_ACCOUNT_SIZE): DidSolServiceBuilder {
    if (size && size < INITIAL_MIN_ACCOUNT_SIZE) {
      throw new Error(`Account size must be at least ${INITIAL_MIN_ACCOUNT_SIZE}`);
    }

    const instructionPromise = this.program.methods
      .initialize(size)
      .accounts({
        didData: this.didDataAccount,
        authority: this.didAuthority
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.NotSupported,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE
    });
  }

  /**
   * Resize the did:sol account.
   * Supports ethSignInstruction
   * @param size The new size of the account
   * @param payer The account to pay the rent-exempt fee with.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  resize(size: number, payer: PublicKey, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods
      .resize(size, null)
      .accounts({
        didData: this.didDataAccount,
        payer,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE
    });
  }

  /**
   * Close the did:sol account.
   * Supports ethSignInstruction
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   * @param destination The destination account to move the lamports to.
   */
  close(destination: PublicKey, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods
      .close(null)
      .accounts({
        didData: this.didDataAccount,
        authority,
        destination,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE
    });
  }

  /**
   * Add a VerificationMethod to the did:sol account.
   * Supports ethSignInstruction
   * @param method The new VerificationMethod to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addVerificationMethod(method: VerificationMethod, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods.addVerificationMethod({
      alias: method.alias,
      keyData: method.keyData,
      methodType: method.methodType,
      flags: method.flags,
    }, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE // TODO
    });
  }

  /**
   * Remove a VerificationMethod from the did:sol account.
   * @param alias The alias of the VerificationMethod to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeVerificationMethod(alias: string, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods.removeVerificationMethod(alias, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE // TODO
    });
  }

  /**
   * Add a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param service The service to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addService(service: Service, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods.addService(service, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction()

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE
    });
  }

  /**
   * Removes a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param id The id of the service to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeService(id: string, authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods.removeService(id, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction()

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE
    });
  }

  /**
   * Update the Flags of a VerificationMethod.
   * @param alias The alias of the VerificationMethod to update
   * @param flags The flags to set. If flags contain VerificationMethodFlags.OwnershipProof, the transaction must be signed by the exact same VM.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setVerificationMethodFlags(alias: string,
                             flags: VerificationMethodFlags,
                             authority: PublicKey = this.didAuthority): DidSolServiceBuilder {
    const instructionPromise = this.program.methods.setVmFlags({
      alias,
      flags
    }, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction()


    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE // TODO: Update sizes for all transactions
    });
  }

  /**
   * Update the controllers of a Service.
   * @param controllerDIDs A list of DIDs to be set as controllers
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setControllers(controllerDIDs: string[],
                 authority: PublicKey = this.didAuthority): DidSolServiceBuilder {

    const updateControllers = validateAndSplitControllers(controllerDIDs);

    const instructionPromise = this.program.methods.setControllers(updateControllers, null).accounts({
      didData: this.didDataAccount,
      authority
    }).instruction()


    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDelta: INITIAL_MIN_ACCOUNT_SIZE // TODO: Update sizes for all transactions
    });
  }

  /**
   * Resolves the DID Document for the did:sol account.
   */
  async resolve(checkLegacy = true): Promise<DIDDocument> {
    const didDataAccount = await this.getDidAccount();
    if (didDataAccount) {
      return DidSolDocument.from(didDataAccount as DidDataAccount, this.cluster);
    }

    // backwards compatibility
    if (checkLegacy) {
      const legacyDocument = await this.resolveLegacy();
      if (legacyDocument) {
        return legacyDocument;
      }
    }

    // generative case
    return DidSolDocument.sparse(DidSolIdentifier.create(this.didAuthority, this.cluster))
  }

  /**
   * Resolves a legacy did:sol account (program: idDa...).
   * Returns null if the account does not exist.
   */
  private async resolveLegacy(): Promise<DIDDocument|null> {
    const id = new DecentralizedIdentifier({
      clusterType: ClusterType.parse(this.cluster),
      authorityPubkey: SolPublicKey.fromPublicKey(this.didAuthority),
    });
    const connection = this.program.provider.connection
    const solData = await SolTransaction.getSol(
      connection,
      id.clusterType,
      await id.pdaSolanaPubkey()
    );
    if (solData !== null) {
      return solData.toDIDDocument();
    }

    return null;
  }

  /**
   * migrates a legacy
   */
  async migrateFromLegacy(): Promise<void> {
    const legacyDocument = await this.resolveLegacy();
    if (!legacyDocument) { return; } // no legacy document

    // TODO: finish implementation
  }
}

enum DidSolEthSignStatusType {
  NotSupported,
  Unsigned,
  Signed,
}

export type BuilderInstruction = {
  instructionPromise: Promise<TransactionInstruction>;
  ethSignStatus: DidSolEthSignStatusType;
  didAccountSizeDelta: number;
}

class DummyWallet implements Wallet {
  publicKey: PublicKey;

  constructor() {
    this.publicKey = new PublicKey("11111111111111111111111111111111");
  }

  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return Promise.reject('DummyWallet does not support signing transactions');
  }

  signTransaction(tx: Transaction): Promise<Transaction> {
    return Promise.reject('DummyWallet does not support signing transactions');
  }

}

export type DidSolServiceBuilderInitOptions = {
  ethSigner?: EthSigner;
  resizePayer?: PublicKey;
  partialSigners?: Signer[];
}

export class DidSolServiceBuilder {
  private solWallet: Wallet;
  private connection: Connection;
  private confirmOptions: ConfirmOptions;

  private ethSigner: EthSigner | undefined;
  private resizePayer: PublicKey | undefined;
  private partialSigners: Signer[] = [];
  private readonly idlErrors: Map<number, string>;


  constructor(private service: DidSolService,
              private instruction: BuilderInstruction,
              initOptions: DidSolServiceBuilderInitOptions = {}) {
    this.solWallet = this.service.getWallet();
    this.connection = this.service.getConnection();
    this.confirmOptions = this.service.getConfrirmOptions();

    this.ethSigner = initOptions.ethSigner;
    this.resizePayer = initOptions.resizePayer;
    this.partialSigners = initOptions.partialSigners || [];

    this.idlErrors = parseIdlErrors(service.getIdl());
  }

  withEthSigner(ethSigner: EthSigner): DidSolServiceBuilder {
    this.ethSigner = ethSigner;
    return this;
  }

  withConnection(connection: Connection): DidSolServiceBuilder {
    this.connection = connection;
    return this;
  }

  withConfirmOptions(confirmOptions: ConfirmOptions): DidSolServiceBuilder {
    this.confirmOptions = confirmOptions;
    return this;
  }

  withSolWallet(solWallet: Wallet): DidSolServiceBuilder {
    // rebuild provider
    this.solWallet = solWallet;
    return this;
  }

  withAutomaticResize(resizePayer: PublicKey): DidSolServiceBuilder {
    this.resizePayer = resizePayer;
    return this;
  }

  withPartialSigners(...signers: Signer[]) {
    this.partialSigners = signers;
    return this;
  }

  /**
   * Signs a supported DidSol Instruction with an Ethereum Signer.
   */
  private async ethSignInstructions(): Promise<void> {
    const all = [this.instruction];
    let lastNonce = await this.service.getNonce();

    const promises = all.map(async (instruction) => {
      if (!this.ethSigner || instruction.ethSignStatus !== DidSolEthSignStatusType.Unsigned) { return; }

      instruction.instructionPromise = ethSignPayload(await instruction.instructionPromise, lastNonce, this.ethSigner);
      instruction.ethSignStatus = DidSolEthSignStatusType.Signed;
      lastNonce = lastNonce.addn(1);
    });

    await Promise.all(promises);
  }

  // Terminal Instructions
  async instructions(): Promise<TransactionInstruction[]> {
    // ethSign
    await this.ethSignInstructions();
    return [await this.instruction.instructionPromise];
  }

  async transaction(): Promise<Transaction> {
    const tx = new Transaction();
    const instructions = await this.instructions();
    tx.add(...instructions)
    return tx;
  }

  async rpc(opts?: ConfirmOptions): Promise<string> {
    const provider = new AnchorProvider(this.connection, this.solWallet, this.confirmOptions);

    const tx = await this.transaction();
    try {
      return await provider.sendAndConfirm(
        tx,
        this.partialSigners,
        opts
      );
    } catch (err) {
      throw translateError(err, this.idlErrors);
    }
  }



}

