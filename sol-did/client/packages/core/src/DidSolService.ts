import { SolDid } from '@identity.com/sol-did-idl';
import { AnchorProvider, BN, Idl, Program } from '@project-serum/anchor';

import {
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
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { DIDDocument } from 'did-resolver';
import {
  RawDidSolDataAccount,
  DidSolServiceOptions,
  DidSolUpdateArgs,
  Service,
  Wallet,
  BitwiseVerificationMethodFlag,
  AddVerificationMethodParams,
} from './lib/types';
import { DEFAULT_KEY_ID, INITIAL_MIN_ACCOUNT_SIZE } from './lib/const';
import { DidSolDocument } from './DidSolDocument';
import { ExtendedCluster, getConnectionByCluster } from './lib/connection';
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
import { DidSolDataAccount, VerificationMethodFlags } from './lib/wrappers';
import {
  DidSolEthSignStatusType,
  DidSolTransactionBuilder,
} from './utils/DidSolTransactionBuilder';

/**
 * The DidSolService class is a wrapper around the Solana DID program.
 * It provides methods for creating, reading, updating, and deleting DID documents.
 * Note, the provider or connection in the DidSolService MUST not be used for tx submissions.
 * Please use DidSolServiceBuilder instead
 */
export class DidSolService extends DidSolTransactionBuilder {
  private _identifier: DidSolIdentifier;

  static async build(
    identifier: DidSolIdentifier,
    options: DidSolServiceOptions
  ): Promise<DidSolService> {
    const wallet = options.wallet || new NonSigningWallet();
    const confirmOptions =
      options.confirmOptions || AnchorProvider.defaultOptions();
    const connection =
      options.connection ||
      getConnectionByCluster(
        identifier.clusterType,
        confirmOptions.preflightCommitment
      );

    // Note, DidSolService never signs, so provider does not need a valid Wallet or confirmOptions.
    const provider = new AnchorProvider(connection, wallet, confirmOptions);

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
    wallet: Wallet = new NonSigningWallet(),
    confirmOptions: ConfirmOptions = AnchorProvider.defaultOptions()
  ) {
    super(wallet, _program.provider.connection, confirmOptions, _program.idl);
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
   * @param identifier
   * @param wallet
   * @param confirmOptions
   */
  async build(
    identifier: DidSolIdentifier,
    wallet?: Wallet,
    confirmOptions?: ConfirmOptions
  ): Promise<DidSolService> {
    const didAuthority = identifier.authority;
    const [didDataAccount] = await findProgramAddress(didAuthority);
    const [legacyDidDataAccount] = await findLegacyProgramAddress(didAuthority);

    if (this._cluster !== identifier.clusterType) {
      throw new Error(
        'Cannot build a service from an existing service with a different cluster'
      );
    }

    // reuse existing program
    return new DidSolService(
      this._program,
      didAuthority,
      didDataAccount,
      legacyDidDataAccount,
      this._cluster,
      wallet ? wallet : this._wallet,
      confirmOptions ? confirmOptions : this.confirmOptions
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

  /**
   * Initializes the did:sol account.
   * Does **not** support ethSignInstruction
   * @param size The initial size of the account
   * @param payer The account to pay the rent-exempt fee with.
   */
  initialize(
    size: number = INITIAL_MIN_ACCOUNT_SIZE,
    payer: PublicKey = this._wallet.publicKey
  ): DidSolService {
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

    this.setInitInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.NotSupported,
      didAccountChangeCallback: () => {
        throw new Error('Not Implemented');
      },
      allowsDynamicAlloc: false,
      authority: this._didAuthority,
    });

    return this;
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
    payer: PublicKey = this._wallet.publicKey,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .resize(size, null)
      .accounts({
        didData: this._didDataAccount,
        payer,
        authority,
      })
      .instruction();

    this.setResizeInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: () => {
        throw new Error('Not Implemented');
      },
      allowsDynamicAlloc: false,
      authority,
    });

    return this;
  }

  /**
   * Close the did:sol account.
   * Supports ethSignInstruction
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   * @param destination The destination account to move the lamports to.
   */
  close(
    destination: PublicKey,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .close(null)
      .accounts({
        didData: this._didDataAccount,
        authority,
        destination,
      })
      .instruction();

    this.setCloseInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: () => {
        throw new Error('Not Implemented');
      },
      allowsDynamicAlloc: false,
      authority,
    });

    return this;
  }

  /**
   * Add a VerificationMethod to the did:sol account.
   * Supports ethSignInstruction
   * @param method The new VerificationMethod to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addVerificationMethod(
    method: AddVerificationMethodParams,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const vm = {
      fragment: method.fragment,
      keyData: method.keyData,
      methodType: method.methodType,
      flags: VerificationMethodFlags.ofArray(method.flags).raw,
    };

    const instructionPromise = this._program.methods
      .addVerificationMethod(vm, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        account.verificationMethods.push(vm);
        return [
          account,
          size + DidAccountSizeHelper.getVerificationMethodSize(method),
        ];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Remove a VerificationMethod from the did:sol account.
   * @param fragment The fragment of the VerificationMethod to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeVerificationMethod(
    fragment: string,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .removeVerificationMethod(fragment, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        const index = account.verificationMethods.findIndex(
          (x) => x.fragment === fragment
        );
        let newSize = size;
        if (index !== -1) {
          newSize -= DidAccountSizeHelper.getVerificationMethodSize(
            account.verificationMethods[index]
          );
          account.verificationMethods.splice(index, 1);
        }

        return [account, newSize];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Add a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param service The service to add
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  addService(
    service: Service,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .addService(service, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        account.services.push(service);
        return [account, size + DidAccountSizeHelper.getServiceSize(service)];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Removes a Service to the did:sol account.
   * Supports ethSignInstruction
   * @param fragment The id of the service to remove
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  removeService(
    fragment: string,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .removeService(fragment, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        const index = account.services.findIndex(
          (x) => x.fragment === fragment
        );
        let newSize = size;
        if (index !== -1) {
          newSize -= DidAccountSizeHelper.getServiceSize(
            account.services[index]
          );
          account.services.splice(index, 1);
        }

        return [account, newSize];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Update the Flags of a VerificationMethod.
   * @param fragment The fragment of the VerificationMethod to update
   * @param flags The flags to set. If flags contain BitwiseVerificationMethodFlag.OwnershipProof, the transaction must be signed by the exact same VM.
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setVerificationMethodFlags(
    fragment: string,
    flags: BitwiseVerificationMethodFlag[],
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const instructionPromise = this._program.methods
      .setVmFlags(
        {
          fragment,
          flags: VerificationMethodFlags.ofArray(flags).raw,
        },
        null
      )
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        // no size change (just flags)
        return [account, size];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Update the controllers of a Service.
   * @param controllerDIDs A list of DIDs to be set as controllers
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  setControllers(
    controllerDIDs: string[],
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const updateControllers = validateAndSplitControllers(controllerDIDs);

    const instructionPromise = this._program.methods
      .setControllers(updateControllers, null)
      .accounts({
        didData: this._didDataAccount,
        authority,
      })
      .instruction();

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        const add =
          updateControllers.nativeControllers.length * 32 +
          updateControllers.otherControllers.reduce(
            (acc, c) => acc + 4 + getBinarySize(c),
            0
          );
        const remove =
          account.nativeControllers.length * 32 +
          account.otherControllers.reduce(
            (acc, c) => acc + 4 + getBinarySize(c),
            0
          );

        account.nativeControllers = updateControllers.nativeControllers;
        account.otherControllers = updateControllers.otherControllers;
        return [account, size + add - remove];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Updates a DID with contents of document.
   * @param document A did:sol Document of the DID to update
   * @param authority The authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  updateFromDoc(
    document: DidSolDocument,
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
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
    authority: PublicKey = this._wallet.publicKey
  ): DidSolService {
    const updateControllers = validateAndSplitControllers(
      updateArgs.controllerDIDs
    );
    const verificationMethods = updateArgs.verificationMethods.map(
      (method) => ({
        fragment: method.fragment,
        keyData: method.keyData,
        methodType: method.methodType,
        flags: VerificationMethodFlags.ofArray(method.flags).raw,
      })
    );

    const instructionPromise = this._program.methods
      .update(
        {
          verificationMethods,
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

    this.addGeneralInstruction({
      instructionPromise,
      postInstructionPromises: [],
      ethSignStatus: DidSolEthSignStatusType.Unsigned,
      didAccountChangeCallback: (account, size) => {
        let add = 0;
        add += updateControllers.nativeControllers.length * 32;
        add += updateControllers.otherControllers.reduce(
          (acc, c) => acc + 4 + getBinarySize(c),
          0
        );
        // 'default' does not take up any "extra" space
        const updatedVerificationMethods = verificationMethods.filter(
          (value) => value.fragment !== DEFAULT_KEY_ID
        );
        add += updatedVerificationMethods.reduce(
          (acc, method) =>
            acc + DidAccountSizeHelper.getVerificationMethodSize(method),
          0
        );
        add += updateArgs.services.reduce(
          (acc, service) => acc + DidAccountSizeHelper.getServiceSize(service),
          0
        );

        let remove = 0;
        remove += account.nativeControllers.length * 32;
        remove += account.otherControllers.reduce(
          (acc, c) => acc + 4 + getBinarySize(c),
          0
        );
        // 'default' does not take up any space
        remove += account.verificationMethods.reduce(
          (acc, method) =>
            acc + DidAccountSizeHelper.getVerificationMethodSize(method),
          0
        );
        remove += account.services.reduce(
          (acc, service) => acc + DidAccountSizeHelper.getServiceSize(service),
          0
        );

        account.verificationMethods = updatedVerificationMethods;
        account.services = updateArgs.services;
        account.nativeControllers = updateControllers.nativeControllers;
        account.otherControllers = updateControllers.otherControllers;

        const newSize = size + add - remove;
        return [account, newSize];
      },
      allowsDynamicAlloc: true,
      authority,
    });

    return this;
  }

  /**
   * Updates several properties of a service.
   * @param payer Payer for the creation of the new Account
   * @param legacyAuthority if passed, close the legacy account after migration. Refund will go to payer.
   */
  migrate(
    payer: PublicKey = this._wallet.publicKey,
    legacyAuthority?: PublicKey
  ): DidSolService {
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
    let postInstructionPromises: Promise<TransactionInstruction>[] = [];
    if (legacyAuthority) {
      postInstructionPromises = [
        Promise.resolve(
          closeAccount(this._legacyDidDataAccount, legacyAuthority, payer)
        ),
      ];
    }

    this.setInitInstruction({
      instructionPromise,
      postInstructionPromises,
      ethSignStatus: DidSolEthSignStatusType.NotSupported,
      didAccountChangeCallback: () => {
        throw new Error('Dynamic Alloc not supported');
      },
      allowsDynamicAlloc: false,
      authority,
    });

    return this;
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
