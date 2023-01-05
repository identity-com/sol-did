import {
  RawDidSolDataAccount,
  Service,
  RawVerificationMethod,
  Bytes,
  VerificationMethodType,
  BitwiseVerificationMethodFlag,
  AddVerificationMethodParams,
} from './types';
import { BN } from '@project-serum/anchor';
import { findProgramAddress, mapControllers } from './utils';
import { ExtendedCluster } from './connection';
import { DidSolIdentifier } from '../DidSolIdentifier';
import { PublicKey } from '@solana/web3.js';
import { DEFAULT_KEY_ID } from './const';

/**
 * A class representing the on-chain data for a SOL DID
 */
export class DidSolDataAccount {
  private readonly _identifier;

  private constructor(
    private _rawDidDataAccount: RawDidSolDataAccount,
    private _cluster: ExtendedCluster
  ) {
    this._identifier = DidSolIdentifier.create(
      new PublicKey(this._rawDidDataAccount.initialVerificationMethod.keyData),
      this._cluster
    );
  }

  static from(
    rawDidDataAccount: RawDidSolDataAccount,
    cluster: ExtendedCluster
  ): DidSolDataAccount {
    return new DidSolDataAccount(rawDidDataAccount, cluster);
  }

  static generative(identifier: DidSolIdentifier): DidSolDataAccount {
    if (!identifier.clusterType) {
      throw new Error(
        `Cannot create generative DID from unknown cluster: ${identifier.toString()}`
      );
    }

    // calculate bump
    const [_, bump] = findProgramAddress(identifier.authority);

    return new DidSolDataAccount(
      {
        version: 0,
        bump,
        nonce: new BN(0),
        initialVerificationMethod: {
          fragment: DEFAULT_KEY_ID,
          methodType: VerificationMethodType.Ed25519VerificationKey2018,
          keyData: identifier.authority.toBuffer(),
          flags:
            BitwiseVerificationMethodFlag.CapabilityInvocation |
            BitwiseVerificationMethodFlag.OwnershipProof,
        },
        verificationMethods: [],
        services: [],
        nativeControllers: [],
        otherControllers: [],
      },
      identifier.clusterType
    );
  }

  get identifier(): DidSolIdentifier {
    return this._identifier;
  }

  get raw(): RawDidSolDataAccount {
    return this._rawDidDataAccount;
  }

  get version(): number {
    return this._rawDidDataAccount.version;
  }

  get bump(): number {
    return this._rawDidDataAccount.bump;
  }

  get nonce(): BN {
    return this._rawDidDataAccount.nonce;
  }

  get verificationMethods(): VerificationMethod[] {
    return [
      this._rawDidDataAccount.initialVerificationMethod,
      ...this._rawDidDataAccount.verificationMethods,
    ].map(VerificationMethod.from);
  }

  get services(): Service[] {
    return this._rawDidDataAccount.services;
  }

  get controllers(): string[] {
    return mapControllers(
      this._rawDidDataAccount.nativeControllers,
      this._rawDidDataAccount.otherControllers,
      this._cluster
    );
  }
}

export class VerificationMethod {
  private constructor(private _rawVerificationMethod: RawVerificationMethod) {}

  get raw(): RawVerificationMethod {
    return this._rawVerificationMethod;
  }

  static from(
    rawVerificationMethod: RawVerificationMethod
  ): VerificationMethod {
    return new VerificationMethod(rawVerificationMethod);
  }

  toParams(): AddVerificationMethodParams {
    return {
      fragment: this.fragment,
      keyData: this.keyData,
      methodType: this.methodType,
      flags: this.flags.array,
    };
  }

  get fragment(): string {
    return this._rawVerificationMethod.fragment;
  }

  get keyData(): Buffer {
    return this._rawVerificationMethod.keyData;
  }

  get methodType(): VerificationMethodType {
    return this._rawVerificationMethod.methodType;
  }

  get flags(): VerificationMethodFlags {
    return new VerificationMethodFlags(this._rawVerificationMethod.flags);
  }
}

export class VerificationMethodFlags {
  constructor(private _flags: number) {}

  static none() {
    return new VerificationMethodFlags(0);
  }

  static of(flags: number) {
    return new VerificationMethodFlags(flags);
  }

  get raw(): number {
    return this._flags;
  }

  static ofArray(
    flags: BitwiseVerificationMethodFlag[]
  ): VerificationMethodFlags {
    return flags.reduce(
      (acc, flag) => acc.set(flag),
      VerificationMethodFlags.none()
    );
  }

  get array(): BitwiseVerificationMethodFlag[] {
    return Object.keys(BitwiseVerificationMethodFlag)
      .map((i) => parseInt(i))
      .filter((i) => !isNaN(i) && this.has(i));
  }

  has(flag: BitwiseVerificationMethodFlag): boolean {
    return (this._flags & flag) === flag;
  }

  set(flag: BitwiseVerificationMethodFlag): VerificationMethodFlags {
    this._flags |= flag;
    return this;
  }

  clear(flag: BitwiseVerificationMethodFlag): VerificationMethodFlags {
    this._flags &= ~flag;
    return this;
  }
}
