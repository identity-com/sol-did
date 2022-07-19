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
  DidDataAccount, DidSolUpdateArgs,
  EthSigner,
  Service,
  VerificationMethod,
  VerificationMethodFlags,
  Wallet,
} from './lib/types';
import { INITIAL_MIN_ACCOUNT_SIZE } from './lib/const';
import { DidSolDocument } from './DidSolDocument';
import { ExtendedCluster, getConnectionByCluster } from './lib/connection';
import { DidSolIdentifier } from './DidSolIdentifier';
import {
  ClusterType,
  DecentralizedIdentifier,
  SolPublicKey,
} from '@identity.com/sol-did-client-legacy';
import { SolTransaction } from '@identity.com/sol-did-client-legacy';
import { DidAccountSizeHelper } from './DidAccountSizeHelper';

/**
 * The DidSolService class is a wrapper around the Solana DID program.
 * It provides methods for creating, reading, updating, and deleting DID documents.
 * Note, the provider or connection in the DidSolService MUST not be used for tx submissions.
 * Please use DidSolServiceBuilder instead
 */
export class DidSolService {
  private _identifier: DidSolIdentifier;

  static async build(
    didIdentifier: PublicKey,
    cluster: ExtendedCluster,
    wallet: Wallet = new DummyWallet(),
    opts: ConfirmOptions = AnchorProvider.defaultOptions()
  ): Promise<DidSolService> {
    const connection = getConnectionByCluster(
      cluster,
      opts.preflightCommitment
    );
    // Note, DidSolService never signs, so provider does not need a valid Wallet or confirmOptions.
    const provider = new AnchorProvider(connection, wallet, opts);

    const program = await fetchProgram(provider);
    const [didDataAccount, _] = await findProgramAddress(didIdentifier);

    return new DidSolService(
      program,
      didIdentifier,
      didDataAccount,
      cluster,
      provider.wallet,
      provider.opts
    );
  }

  constructor(
    private _program: Program<SolDid>,
    private _didAuthority: PublicKey,
    private _didDataAccount: PublicKey,
    private _cluster: ExtendedCluster = 'mainnet-beta',
    private _wallet: Wallet = new DummyWallet(),
    private _opts: ConfirmOptions = AnchorProvider.defaultOptions()
  ) {
    this._identifier = DidSolIdentifier.create(_didAuthority, _cluster);
  }

  get connection(): Connection {
    return this._program.provider.connection;
  }

  async getDidAccount(): Promise<DidDataAccount | null> {
    return (await this._program.account.didAccount.fetchNullable(
      this._didDataAccount
    )) as DidDataAccount;
  }

  async getDidAccountWithSize(
    commitment?: Commitment
  ): Promise<[DidDataAccount | null, number]> {
    const accountInfo = await this._program.account.didAccount.getAccountInfo(
      this._didDataAccount,
      commitment
    );
    if (accountInfo === null) {
      return [null, 0];
    }

    const size = accountInfo.data.length;

    const didAccount =
      this._program.account.didAccount.coder.accounts.decode<DidDataAccount>(
        'DidAccount', // TODO: from "this._program.account.didAccount._idlAccount.name" - How to get this officially?
        accountInfo.data
      );

    return [didAccount, size];
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
      didAccountSizeDeltaCallback: () => size,
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
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        if (!didAccountBefore) {
          throw new Error('Cannot close account on uninitialized account');
        }

        return (
          size -
          DidAccountSizeHelper.fromAccount(
            didAccountBefore
          ).getTotalNativeAccountSize()
        );
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
      didAccountSizeDeltaCallback: (didAccountBefore) => {
        if (!didAccountBefore) {
          throw new Error('Cannot close account on uninitialized account');
        }

        return -DidAccountSizeHelper.fromAccount(
          didAccountBefore
        ).getTotalNativeAccountSize();
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
    method: VerificationMethod,
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
   * @param flags The flags to set. If flags contain VerificationMethodFlags.OwnershipProof, the transaction must be signed by the exact same VM.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setVerificationMethodFlags(
    fragment: string,
    flags: VerificationMethodFlags,
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
      didAccountSizeDeltaCallback: () => 0, // No size change
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
   * Updates several properties of a service.
   * @param updateArgs A subset of DID properties to update
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  update(
    updateArgs: DidSolUpdateArgs,
    authority: PublicKey = this._didAuthority
  ): DidSolServiceBuilder {
    const instructionPromise = this._program.methods
      .update(updateArgs, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    return new DidSolServiceBuilder(this, {
      instructionPromise,
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountSizeDeltaCallback: () => 10_000, // TODO: Martin calculate size change
      allowsDynamicAlloc: false,
      authority,
    });
  };

  /**
   * Resolves the DID Document for the did:sol account.
   */
  async resolve(checkLegacy = true): Promise<DIDDocument> {
    const didDataAccount = await this.getDidAccount();
    if (didDataAccount) {
      return DidSolDocument.from(
        didDataAccount as DidDataAccount,
        this._cluster
      );
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

  /**
   * Resolves a legacy did:sol account (program: idDa...).
   * Returns null if the account does not exist.
   */
  private async resolveLegacy(): Promise<DIDDocument | null> {
    const id = new DecentralizedIdentifier({
      clusterType: ClusterType.parse(this._cluster),
      authorityPubkey: SolPublicKey.fromPublicKey(this._didAuthority),
    });
    const connection = this._program.provider.connection;
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
    if (!legacyDocument) {
      return;
    } // no legacy document

    // Update the new did:sol with legacyDocument
    // Franks functionallity;
    // TODO: finish implementation

    // close legacy account and recover rent.
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
    didAccountBefore: DidDataAccount | null
  ) => number;
  allowsDynamicAlloc: boolean;
  authority: PublicKey;
};

class DummyWallet implements Wallet {
  publicKey: PublicKey;

  constructor() {
    this.publicKey = new PublicKey('11111111111111111111111111111111');
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

    return Promise.all(promises);
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
          didAccount
        ).getTotalNativeAccountSize() +
        this.instruction.didAccountSizeDeltaCallback(didAccount);
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
