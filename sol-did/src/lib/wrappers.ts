import {
  RawDidSolDataAccount,
  Service,
  RawVerificationMethod,
  Bytes,
  VerificationMethodType,
  BitwiseVerificationMethodFlag,
} from './types';
import { BN } from '@project-serum/anchor';
import { mapControllers } from './utils';
import { ExtendedCluster } from './connection';
import { DidSolIdentifier } from '../DidSolIdentifier';
import { PublicKey } from '@solana/web3.js';

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

  get fragment(): string {
    return this._rawVerificationMethod.fragment;
  }

  get keyData(): Bytes {
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
    return new VerificationMethodFlags(BitwiseVerificationMethodFlag.None);
  }

  get raw(): number {
    return this._flags;
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
