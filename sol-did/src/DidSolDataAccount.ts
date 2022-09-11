import { RawDidDataAccount, Service, VerificationMethod } from './lib/types';
import { BN } from '@project-serum/anchor';
import { mapControllers } from './lib/utils';
import { ExtendedCluster } from './lib/connection';
import { DidSolIdentifier } from './DidSolIdentifier';
import { PublicKey } from '@solana/web3.js';

/**
 * A class representing the on-chain data for a SOL DID
 */
export class DidSolDataAccount {
  private readonly _identifier;

  private constructor(
    private _rawDidDataAccount: RawDidDataAccount,
    private _cluster: ExtendedCluster
  ) {
    this._identifier = DidSolIdentifier.create(
      new PublicKey(this._rawDidDataAccount.initialVerificationMethod.keyData),
      this._cluster
    );
  }

  static from(
    rawDidDataAccount: RawDidDataAccount,
    cluster: ExtendedCluster
  ): DidSolDataAccount {
    return new DidSolDataAccount(rawDidDataAccount, cluster);
  }

  get identifier(): DidSolIdentifier {
    return this._identifier;
  }

  get raw(): RawDidDataAccount {
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
    ];
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
