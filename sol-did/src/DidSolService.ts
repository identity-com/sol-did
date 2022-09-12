import { SolDid } from '../target/types/sol_did';
import {
  AnchorProvider,
  BN,
  Idl,
  parseIdlErrors,
  Program,
  translateError,
} from '@project-serum/anchor';

import {
  ethSignPayload,
  fetchProgram,
  findLegacyProgramAddress,
  findProgramAddress,
  getBinarySize,
  validateAndSplitControllers,
} from './lib/utils';
import {
  Commitment,
  ConfirmOptions,
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import {
  RawDidSolDataAccount,
  DidSolUpdateArgs,
  EthSigner,
  Service,
  RawVerificationMethod,
  Wallet,
} from './lib/types';
import { DEFAULT_KEY_ID, INITIAL_MIN_ACCOUNT_SIZE } from './lib/const';
import { DidSolDocument } from './DidSolDocument';
import {
  CustomClusterUrlConfig,
  ExtendedCluster,
  getConnectionByCluster,
} from './lib/connection';
import { DidSolIdentifier } from './DidSolIdentifier';
import {
  closeAccount,
  ClusterType,
  DecentralizedIdentifier,
  SolData,
  SolPublicKey,
  SolTransaction,
} from '@identity.com/sol-did-client-legacy';
import { DidAccountSizeHelper } from './DidAccountSizeHelper';
import { DidSolDataAccount } from './lib/wrappers';

/**
 * The DidSolService class is a wrapper around the Solana DID program.
 * It provides methods for creating, reading, updating, and deleting DID documents.
 * Note, the provider or connection in the DidSolService MUST not be used for tx submissions.
 * Please use DidSolServiceBuilder instead
 */
export class DidSolService {
  private _identifier: DidSolIdentifier;

  static async build(
    identifier: DidSolIdentifier,
    customConfig?: CustomClusterUrlConfig,
    wallet: Wallet = new NonSigningWallet(),
    opts: ConfirmOptions = AnchorProvider.defaultOptions()
  ): Promise<DidSolService> {
    const _connection = getConnectionByCluster(
      identifier.clusterType,
      opts.preflightCommitment,
      customConfig
    );
    // Note, DidSolService never signs, so provider does not need a valid Wallet or confirmOptions.
    const provider = new AnchorProvider(_connection, wallet, opts);

    const program = await fetchProgram(provider);
    const [didDataAccount] = await findProgramAddress(identifier.authority);
    const [legacyDidDataAccount] = await findLegacyProgramAddress(
      identifier.authority
    );

    return new DidSolService(
      program,
      identifier.authority,
      didDataAccount,
      legacyDidDataAccount,
      identifier.clusterType,
      provider.wallet,
      provider.opts
    );
  }

  static async buildFromAnchor(
    program: Program<SolDid>,
    identifier: DidSolIdentifier,
    provider: AnchorProvider,
    wallet?: Wallet
  ): Promise<DidSolService> {
    const [didDataAccount] = await identifier.dataAccount();
    const [legacyDidDataAccount] = await identifier.legacyDataAccount();

    return new DidSolService(
      program,
      identifier.authority,
      didDataAccount,
      legacyDidDataAccount,
      identifier.clusterType,
      wallet ? wallet : provider.wallet,
      provider.opts
    );
  }

  private constructor(
    private _program: Program<SolDid>,
    private _didAuthority: PublicKey,
    private _didDataAccount: PublicKey,
    private _legacyDidDataAccount: PublicKey,
    private _cluster: ExtendedCluster = 'mainnet-beta',
    private _wallet: Wallet = new NonSigningWallet(),
    private _opts: ConfirmOptions = AnchorProvider.defaultOptions()
  ) {
    this._identifier = DidSolIdentifier.create(_didAuthority, _cluster);
  }

  get connection(): Connection {
    return this._program.provider.connection;
  }

  get didDataAccount(): PublicKey {
    return this._didDataAccount;
  }

  get legacyDidDataAccount(): PublicKey {
    return this._legacyDidDataAccount;
  }

  /**
   * Build a Service from an existing Service. Note, this will not allow to generate the service with a different cluster.
   * @param didAuthority
   * @param wallet
   * @param opts
   */
  async build(
    didAuthority: PublicKey,
    wallet?: Wallet,
    opts?: ConfirmOptions
  ): Promise<DidSolService> {
    const [didDataAccount] = await findProgramAddress(didAuthority);
    const [legacyDidDataAccount] = await findLegacyProgramAddress(didAuthority);

    // reuse existing program
    return new DidSolService(
      this._program,
      didAuthority,
      didDataAccount,
      legacyDidDataAccount,
      this._cluster,
      wallet ? wallet : this._wallet,
      opts ? opts : this._opts
    );
  }

  async getDidAccount(): Promise<DidSolDataAccount | null> {
    // TODO: this should be reverted as soon as https://github.com/coral-xyz/anchor/issues/2172 is fixed
    const accountInfo = await this._program.account.didAccount.getAccountInfo(
      this._didDataAccount
    );
    if (accountInfo === null || accountInfo.data.length === 0) {
      return null;
    }

    const dataAccount =
      this._program.account.didAccount.coder.accounts.decode<RawDidSolDataAccount>(
        'DidAccount', // TODO: from "this._program.account.didAccount._idlAccount.name" - How to get this officially?
        accountInfo.data
      );

    return DidSolDataAccount.from(dataAccount, this._cluster);
  }

  async getDidAccountWithSize(
    commitment?: Commitment
  ): Promise<[DidSolDataAccount | null, number]> {
    const accountInfo = await this._program.account.didAccount.getAccountInfo(
      this._didDataAccount,
      commitment
    );
    if (accountInfo === null || accountInfo.data.length === 0) {
      return [null, 0];
    }

    const size = accountInfo.data.length;

    const dataAccount =
      this._program.account.didAccount.coder.accounts.decode<RawDidSolDataAccount>(
        'DidAccount', // TODO: from "this._program.account.didAccount._idlAccount.name" - How to get this officially?
        accountInfo.data
      );

    if (!dataAccount) {
      return [null, size];
    }

    return [DidSolDataAccount.from(dataAccount, this._cluster), size];
  }

  /**
   * Return true if the DID can be migrated to the new program.
   */
  async isMigratable(): Promise<boolean> {
    const current = await this.getDidAccount();
    const legacy = await this.getLegacyData();
    return !current && !!legacy;
  }

  get did(): string {
    return this._identifier.toString();
  }

  getIdl(): Idl {
    return this._program.idl;
  }

  async getNonce(): Promise<BN> {
    const account = await this._program.account.didAccount.fetchNullable(
      this._didDataAccount
    );
    return account ? account.nonce : new BN(0);
  }

  getWallet(): Wallet {
    return this._wallet;
  }

  getConnection(): Connection {
    return this._program.provider.connection;
  }

  getConfrirmOptions(): ConfirmOptions {
    return this._opts;
  }

  /**
   * Initializes the did:sol account.
   * Does **not** support ethSignInstruction
   * @param size The initial size of the account
   * @param payer The account to pay the rent-exempt fee with.
   */
  initialize(
    size: number = INITIAL_MIN_ACCOUNT_SIZE,
    payer: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    if (size < INITIAL_MIN_ACCOUNT_SIZE) {
      throw new Error(
        `Account size must be at least ${INITIAL_MIN_ACCOUNT_SIZE}`
      );
    }

    const instructionPromise = this._program.methods
      .initialize(size)
      .accounts({
        didData: this._didDataAccount,
        authority: this._didAuthority,
        payer,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.NotSupported,
      didAccountSizeDeltaCallback: () => {
        throw new Error('Dynamic Alloc not supported');
      },
      allowsDynamicAlloc: false,
      authority: this._didAuthority,
    });
  }

  /**
   * Resize the did:sol account.
   * Supports ethSignInstruction
   * @param size The new size of the account
   * @param payer The account to pay the rent-exempt fee with.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  resize(
    size: number,
    payer: PublicKey = this._didAuthority,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .resize(size, null)
      .accounts({
        didData: this._didDataAccount,
        payer,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () => {
        throw new Error('Dynamic Alloc not supported');
      },
      allowsDynamicAlloc: false,
      authority,
    });
  }

  /**
   * Close the did:sol account.
   * Supports ethSignInstruction
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   * @param destination The destination account to move the lamports to.
   */
  close(
    destination: PublicKey,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .close(null)
      .accounts({
        didData: this._didDataAccount,
        authority,
        destination,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () => {
        throw new Error('Dynamic Alloc not supported');
      },
      allowsDynamicAlloc: false,
      authority,
    });
  }

  /**
   * Add a VerificationMethod to the did:sol account.
   * Supports ethSignInstruction
   * @param method The new VerificationMethod to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addVerificationMethod(
    method: RawVerificationMethod,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .addVerificationMethod(
        {
          fragment: method.fragment,
          keyData: method.keyData,
          methodType: method.methodType,
          flags: method.flags,
        },
        null
      )
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () =>
        DidAccountSizeHelper.getVerificationMethodSize(method),
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Remove a VerificationMethod from the did:sol account.
   * @param fragment The fragment of the VerificationMethod to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeVerificationMethod(
    fragment: string,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .removeVerificationMethod(fragment, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        if (!didAccountBefore) {
          throw new Error(
            'Cannot remove VerificationMethod on uninitialized account'
          );
        }
        return -DidAccountSizeHelper.getVerificationMethodSize(
          didAccountBefore.verificationMethods.find(
            (m) => m.fragment === fragment
          )
        );
      },
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Add a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param service The service to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addService(
    service: Service,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .addService(service, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () =>
        DidAccountSizeHelper.getServiceSize(service),
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Removes a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param fragment The id of the service to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeService(
    fragment: string,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .removeService(fragment, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        if (!didAccountBefore) {
          throw new Error('Cannot remove Service on uninitialized account');
        }

        return -DidAccountSizeHelper.getServiceSize(
          didAccountBefore.services.find((s) => s.fragment === fragment)
        );
      },
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Update the Flags of a VerificationMethod.
   * @param fragment The fragment of the VerificationMethod to update
   * @param flags The flags to set. If flags contain BitwiseVerificationMethodFlag.OwnershipProof, the transaction must be signed by the exact same VM.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setVerificationMethodFlags(
    fragment: string,
    flags: number,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .setVmFlags(
        {
          fragment,
          flags,
        },
        null
      )
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () => {
        throw new Error('Dynamic Alloc not supported');
      },
      allowsDynamicAlloc: false,
      authority,
    });
  }

  /**
   * Update the controllers of a Service.
   * @param controllerDIDs A list of DIDs to be set as controllers
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setControllers(
    controllerDIDs: string[],
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const updateControllers = validateAndSplitControllers(controllerDIDs);

    const instructionPromise = this._program.methods
      .setControllers(updateControllers, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        const add =
          updateControllers.nativeControllers.length * 32 +
          updateControllers.otherControllers.reduce(
            (acc, c) => acc + 4 + getBinarySize(c),
            0
          );
        let remove = 0;
        if (didAccountBefore) {
          remove =
            didAccountBefore.nativeControllers.length * 32 +
            didAccountBefore.otherControllers.reduce(
              (acc, c) => acc + 4 + getBinarySize(c),
              0
            );
        }

        return add - remove;
      },
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Updates a DID with contents of document.
   * @param document A did:sol Document of the DID to update
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  updateFromDoc(
    document: DidSolDocument,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    if (document.id !== this.did) {
      throw new Error(
        `DID ${document.id} in document does not match DID of Service ${this.did} `
      );
    }

    const updateArgs = document.getDocUpdateArgs();
    return this.update(updateArgs, authority);
  }

  /**
   * Updates several properties of a service.
   * @param updateArgs A subset of DID properties to update
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  update(
    updateArgs: DidSolUpdateArgs,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const updateControllers = validateAndSplitControllers(
      updateArgs.controllerDIDs
    );
    const instructionPromise = this._program.methods
      .update(
        {
          verificationMethods: updateArgs.verificationMethods,
          services: updateArgs.services,
          nativeControllers: updateControllers.nativeControllers,
          otherControllers: updateControllers.otherControllers,
        },
        null
      )
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        let add = 0;
        add += updateControllers.nativeControllers.length * 32;
        add += updateControllers.otherControllers.reduce(
          (acc, c) => acc + 4 + getBinarySize(c),
          0
        );
        // 'default' does not take up any space
        add += updateArgs.verificationMethods
          .filter((value) => value.fragment !== DEFAULT_KEY_ID)
          .reduce(
            (acc, method) =>
              acc + DidAccountSizeHelper.getVerificationMethodSize(method),
            0
          );
        add += updateArgs.services.reduce(
          (acc, service) => acc + DidAccountSizeHelper.getServiceSize(service),
          0
        );

        let remove = 0;
        if (didAccountBefore) {
          remove += didAccountBefore.nativeControllers.length * 32;
          remove += didAccountBefore.otherControllers.reduce(
            (acc, c) => acc + 4 + getBinarySize(c),
            0
          );
          // 'default' does not take up any space
          remove += updateArgs.verificationMethods
            .filter((value) => value.fragment !== DEFAULT_KEY_ID)
            .reduce(
              (acc, method) =>
                acc + DidAccountSizeHelper.getVerificationMethodSize(method),
              0
            );
          remove += didAccountBefore.services.reduce(
            (acc, service) =>
              acc + DidAccountSizeHelper.getServiceSize(service),
            0
          );
        }

        return add - remove;
      },
      allowsDynamicAlloc: true,
      authority,
    });
  }

  /**
   * Updates several properties of a service.
   * @param payer Payer for the creation of the new Account
   * @param legacyAuthority if passed, close the legacy account after migration. Refund will go to payer.
   */
  migrate(
    payer: PublicKey = this._didAuthority,
    legacyAuthority?: PublicKey
  ): DidSolServiceBuilder {
    const authority = this._didAuthority;

    const instructionPromise = this._program.methods
      .migrate()
      .accounts({
        didData: this._didDataAccount,
        authority,
        legacyDidData: this._legacyDidDataAccount,
        payer,
      })
      .instruction();

    // close legacy accounts
    let postInstructions: Promise<TransactionInstruction>[] = [];
    if (legacyAuthority) {
      postInstructions = [
        Promise.resolve(
          closeAccount(this._legacyDidDataAccount, legacyAuthority, payer)
        ),
      ];
    }

    return new DidSolServiceBuilder(
      this,
      {
        instructionPromise,
        ethSignStatus: DidSolEthSignStatusType.NotSupported,
        didAccountSizeDeltaCallback: () => {
          throw new Error('Dynamic Alloc not supported');
        },
        allowsDynamicAlloc: false,
        authority,
      },
      postInstructions
    );
  }

  /**
   * Resolves the DID Document for the did:sol account.
   */
  async resolve(checkLegacy = true): Promise<DIDDocument> {
    const didDataAccount = await this.getDidAccount();
    if (didDataAccount) {
      return DidSolDocument.from(didDataAccount);
    }

    // backwards compatibility
    if (checkLegacy) {
      const legacyDocument = await this.resolveLegacy();
      if (legacyDocument) {
        return legacyDocument;
      }
    }

    // generative case
    return DidSolDocument.sparse(
      DidSolIdentifier.create(this._didAuthority, this._cluster)
    );
  }

  public async getLegacyData(): Promise<SolData | null> {
    const id = new DecentralizedIdentifier({
      clusterType: ClusterType.parse(this._cluster),
      authorityPubkey: SolPublicKey.fromPublicKey(this._didAuthority),
    });
    return SolTransaction.getSol(
      this.connection,
      id.clusterType,
      await id.pdaSolanaPubkey()
    );
  }

  /**
   * Resolves a legacy did:sol account (program: idDa...).
   * Returns null if the account does not exist.
   */
  private async resolveLegacy(): Promise<DIDDocument | null> {
    const solData = await this.getLegacyData();
    if (solData !== null) {
      return solData.toDIDDocument();
    }
    return null;
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
  didAccountSizeDeltaCallback: (
    didAccountBefore: RawDidSolDataAccount | null
  ) => number;
  allowsDynamicAlloc: boolean;
  authority: PublicKey;
};

class NonSigningWallet implements Wallet {
  publicKey: PublicKey;

  constructor() {
    this.publicKey = new PublicKey('11111111111111111111111111111111');
  }

  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return Promise.resolve(txs);
  }

  signTransaction(tx: Transaction): Promise<Transaction> {
    return Promise.resolve(tx);
  }
}

export type DidSolServiceBuilderInitOptions = {
  ethSigner?: EthSigner;
  payer?: PublicKey;
  partialSigners?: Signer[];
};

export class DidSolServiceBuilder {
  private solWallet: Wallet;
  private connection: Connection;
  private confirmOptions: ConfirmOptions;

  private ethSigner: EthSigner | undefined;
  private payer: PublicKey | undefined;
  private partialSigners: Signer[] = [];
  private readonly idlErrors: Map<number, string>;

  constructor(
    private service: DidSolService,
    private _instruction: BuilderInstruction,
    private _postInstructions: Promise<TransactionInstruction>[] = [],
    initOptions: DidSolServiceBuilderInitOptions = {}
  ) {
    this.solWallet = this.service.getWallet();
    this.connection = this.service.getConnection();
    this.confirmOptions = this.service.getConfrirmOptions();

    this.ethSigner = initOptions.ethSigner;
    this.payer = initOptions.payer;
    this.partialSigners = initOptions.partialSigners || [];

    this.idlErrors = parseIdlErrors(service.getIdl());
  }

  withEthSigner(ethSigner: EthSigner): DidSolServiceBuilder {
    this.ethSigner = ethSigner;
    return this;
  }

  get instruction(): BuilderInstruction {
    return this._instruction;
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
    this.solWallet = solWallet;
    return this;
  }

  withAutomaticAlloc(payer: PublicKey): DidSolServiceBuilder {
    this.payer = payer;
    return this;
  }

  withPartialSigners(...signers: Signer[]) {
    this.partialSigners = signers;
    return this;
  }

  /**
   * Signs a supported DidSol Instruction with an Ethereum Signer.
   */
  private async ethSignInstructions(
    instructionsToSign: BuilderInstruction[]
  ): Promise<TransactionInstruction[]> {
    let lastNonce = await this.service.getNonce();

    const promises = instructionsToSign.map(async (instruction) => {
      if (
        !this.ethSigner ||
        instruction.ethSignStatus !== DidSolEthSignStatusType.Unsigned
      ) {
        return instruction.instructionPromise;
      }

      const signingNonce = lastNonce;
      lastNonce = lastNonce.addn(1);

      return ethSignPayload(
        await instruction.instructionPromise,
        signingNonce,
        this.ethSigner
      );
    });

    // Mix in _postInstructions to array. Consider moving to cleaner position
    return Promise.all([...promises, ...this._postInstructions]);
  }

  private async getAllocInstruction(): Promise<BuilderInstruction[]> {
    if (!this.payer || !this.instruction.allowsDynamicAlloc) {
      return [];
    }

    let allocInstruction;
    const [didAccount, didAccountSize] =
      await this.service.getDidAccountWithSize();
    if (didAccount === null) {
      // Initial allocation
      const requiredSize =
        INITIAL_MIN_ACCOUNT_SIZE +
        this.instruction.didAccountSizeDeltaCallback(null);
      allocInstruction = this.service.initialize(
        requiredSize,
        this.payer
      ).instruction;
    } else {
      // Reallocation
      const requiredSize =
        DidAccountSizeHelper.fromAccount(
          didAccount.raw
        ).getTotalNativeAccountSize() +
        this.instruction.didAccountSizeDeltaCallback(didAccount.raw);
      if (didAccountSize >= requiredSize) {
        // ALLOC does NOT shrink an account.
        return [];
      }
      allocInstruction = this.service.resize(
        requiredSize,
        this.payer,
        this.instruction.authority
      ).instruction;
    }

    return [allocInstruction];
  }

  // Terminal Instructions
  async instructions(): Promise<TransactionInstruction[]> {
    // check if additional alloc instructions are needed.
    const allocInstruction = await this.getAllocInstruction();

    // ethSign
    return this.ethSignInstructions([...allocInstruction, this.instruction]);
  }

  async transaction(): Promise<Transaction> {
    const tx = new Transaction();
    const instructions = await this.instructions();
    tx.add(...instructions);
    return tx;
  }

  async rpc(opts?: ConfirmOptions): Promise<string> {
    const provider = new AnchorProvider(
      this.connection,
      this.solWallet,
      this.confirmOptions
    );

    const tx = await this.transaction();
    try {
      return await provider.sendAndConfirm(tx, this.partialSigners, opts);
    } catch (err) {
      throw translateError(err, this.idlErrors);
    }
  }
}
