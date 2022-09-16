import { EthSigner, RawDidSolDataAccount, Wallet } from '../lib/types';
import {
  Commitment,
  ConfirmOptions,
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  AnchorProvider,
  Idl,
  parseIdlErrors,
  translateError,
} from '@project-serum/anchor';
import { ethSignPayload } from '../lib/utils';
import { INITIAL_MIN_ACCOUNT_SIZE } from '../lib/const';
import {
  DidAccountSizeHelper,
  getDefaultRawDidSolDataAccount,
} from '../DidAccountSizeHelper';
import BN from 'bn.js';
import { DidSolDataAccount } from '../lib/wrappers';

export enum DidSolEthSignStatusType {
  NotSupported,
  Unsigned,
  Signed,
}

export type BuilderInstruction = {
  instructionPromise: Promise<TransactionInstruction>;
  postInstructionPromises: Promise<TransactionInstruction>[];
  ethSignStatus: DidSolEthSignStatusType;
  // this takes as input the RawDidSolDataAccount before and returns the RawDidSolDataAccount after
  // with the associated delta
  didAccountChangeCallback: (
    didAccountBefore: RawDidSolDataAccount,
    sizeBefore: number
  ) => [RawDidSolDataAccount, number];
  allowsDynamicAlloc: boolean;
  authority: PublicKey;
};

/**
 *
 */
export abstract class DidSolTransactionBuilder {
  // Init instruction (This instruction assumes there is NO account present yet)
  private _initInstruction?: BuilderInstruction;

  // Resize instruction (Account is present that needs to be resized)
  private _resizeInstruction?: BuilderInstruction; // Should this be a delta?

  // General instructions (that modify the account state only).
  private _generalInstructions: BuilderInstruction[] = [];

  // Close instruction (to close an existing account)
  private _closeInstruction?: BuilderInstruction;

  private readonly _idlErrors: Map<number, string>;

  private readonly _initialWallet: Wallet;

  constructor(
    protected _wallet: Wallet,
    protected _connection: Connection,
    protected _confirmOptions: ConfirmOptions,
    idl: Idl,
    private _partialSigners: Signer[] = [],
    private _ethSigner?: EthSigner | undefined,
    private _payer?: PublicKey | undefined,
    private _resizeAuthority: PublicKey = _wallet.publicKey
  ) {
    this._initialWallet = _wallet;
    this._idlErrors = parseIdlErrors(idl);
  }

  get solWallet(): Wallet {
    return this._wallet;
  }

  get connection(): Connection {
    return this._connection;
  }

  get confirmOptions(): ConfirmOptions {
    return this._confirmOptions;
  }

  get ethSigner(): EthSigner | undefined {
    return this._ethSigner;
  }

  withEthSigner(ethSigner: EthSigner) {
    this._ethSigner = ethSigner;
    return this;
  }

  setInitInstruction(initInstruction: BuilderInstruction) {
    if (this._initInstruction) {
      throw new Error('Init instruction already set.');
    }

    this._initInstruction = initInstruction;
  }

  setResizeInstruction(resizeInstruction: BuilderInstruction) {
    if (this._resizeInstruction) {
      throw new Error('Resize instruction already set.');
    }

    this._resizeInstruction = resizeInstruction;
  }

  setCloseInstruction(closeInstruction: BuilderInstruction) {
    if (this._closeInstruction) {
      throw new Error('Close instruction already set.');
    }

    this._closeInstruction = closeInstruction;
  }

  addGeneralInstruction(instruction: BuilderInstruction) {
    this._generalInstructions.push(instruction);
  }

  /**
   * Clears all prepared Instructions and partialSigners, ethWallet, payer and resizeAuthority.
   */
  public clear() {
    this.clearInstructions();
    this._wallet = this._initialWallet;
    this._partialSigners = [];
    this._ethSigner = undefined;
    this._payer = undefined;
    this._resizeAuthority = this._wallet.publicKey;
  }

  public clearInstructions() {
    this._initInstruction = undefined;
    this._resizeInstruction = undefined;
    this._closeInstruction = undefined;
    this._generalInstructions = [];
  }

  public getState() {
    return {
      initInstruction: this._initInstruction,
      resizeInstruction: this._resizeInstruction,
      closeInstruction: this._closeInstruction,
      generalInstructions: this._generalInstructions,
    };
  }

  withConnection(connection: Connection) {
    this._connection = connection;
    return this;
  }

  withConfirmOptions(confirmOptions: ConfirmOptions) {
    this._confirmOptions = confirmOptions;
    return this;
  }

  withSolWallet(wallet: Wallet) {
    this._wallet = wallet;
    return this;
  }

  withAutomaticAlloc(
    payer: PublicKey,
    resizeAuthority: PublicKey = this._wallet.publicKey
  ) {
    this._payer = payer;
    this._resizeAuthority = resizeAuthority;
    return this;
  }

  withPartialSigners(...signers: Signer[]) {
    this._partialSigners = signers;
    return this;
  }

  abstract getNonce(): Promise<BN>;

  abstract getDidAccount(): Promise<DidSolDataAccount | null>;

  abstract getDidAccountWithSize(
    commitment?: Commitment
  ): Promise<[DidSolDataAccount | null, number]>;

  abstract resize(size: number, payer: PublicKey, authority: PublicKey): void;

  abstract initialize(size: number, payer: PublicKey): void;

  /**
   * Signs a supported DidSol Instruction with an Ethereum Signer.
   */
  private async ethSignInstructions(
    instructionsToSign: BuilderInstruction[]
  ): Promise<TransactionInstruction[]> {
    let lastNonce = await this.getNonce();

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

    //  TODO: These should probably not go all the way to the end.
    for (const instruction of instructionsToSign) {
      for (const postInstructions of instruction.postInstructionPromises) {
        promises.push(postInstructions);
      }
    }

    // Mix in _postInstructions to array. Consider moving to cleaner position
    return Promise.all(promises);
  }

  private getMaxRequiredSize(
    currentAccount: RawDidSolDataAccount,
    currentSize: number
  ): number {
    let current: [RawDidSolDataAccount, number] = [currentAccount, currentSize];
    let maxSize = currentSize;

    for (const instruction of this._generalInstructions) {
      current = instruction.didAccountChangeCallback(current[0], current[1]);
      maxSize = Math.max(maxSize, current[1]);
    }

    return maxSize;
  }

  abstract get didDataAccount(): PublicKey;

  private async setAllocInstruction() {
    if (!this._payer || this._generalInstructions.length === 0) {
      return;
    }

    const [didAccount, didAccountSize] = await this.getDidAccountWithSize();

    if (didAccount === null) {
      // Initial allocation
      const requiredSize = this.getMaxRequiredSize(
        getDefaultRawDidSolDataAccount(this.didDataAccount),
        INITIAL_MIN_ACCOUNT_SIZE
      );
      this.initialize(requiredSize, this._payer);
    } else {
      // Reallocation
      const requiredSize = this.getMaxRequiredSize(
        didAccount.raw,
        DidAccountSizeHelper.fromAccount(
          didAccount.raw
        ).getTotalNativeAccountSize()
      );
      if (didAccountSize < requiredSize) {
        this.resize(requiredSize, this._payer, this._resizeAuthority);
      }
    }
  }

  // Terminal Instructions
  async instructions(): Promise<TransactionInstruction[]> {
    // check if additional alloc instructions are needed.
    await this.setAllocInstruction();

    const instructionChain = [];
    if (this._initInstruction) {
      instructionChain.push(this._initInstruction);
    }
    if (this._resizeInstruction) {
      instructionChain.push(this._resizeInstruction);
    }

    instructionChain.push(...this._generalInstructions);

    if (this._closeInstruction) {
      instructionChain.push(this._closeInstruction);
    }

    this.clearInstructions();

    // ethSign
    return this.ethSignInstructions(instructionChain);
  }

  async transaction(): Promise<Transaction> {
    const tx = new Transaction();
    const instructions = await this.instructions();
    // console.log(JSON.stringify(instructions, null, 2));
    tx.add(...instructions);
    return tx;
  }

  async rpc(opts?: ConfirmOptions): Promise<string> {
    const provider = new AnchorProvider(
      this._connection,
      this._wallet,
      this._confirmOptions
    );

    const tx = await this.transaction();
    try {
      return await provider.sendAndConfirm(tx, this._partialSigners, opts);
    } catch (err) {
      throw translateError(err, this._idlErrors);
    } finally {
      this.clear();
    }
  }
}
