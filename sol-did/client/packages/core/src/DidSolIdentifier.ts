import { PublicKey } from '@solana/web3.js';
import { DecentralizedIdentifierConstructor } from './lib/types';
import {
  findLegacyProgramAddress,
  findProgramAddress,
  isStringDID,
} from './lib/utils';
import { DID_SOL_PREFIX } from './lib/const';
import { VerificationMethod } from 'did-resolver';
import { ExtendedCluster } from './lib/connection';

/**
 * A class representing a SOL Did
 */
export class DidSolIdentifier {
  /**
   * The cluster the DID points to
   */
  clusterType: ExtendedCluster | undefined;
  /**
   * The address of the DID
   */
  authority: PublicKey;
  /**
   * The optional field following the DID address and `#`
   */
  fragment?: string;

  /**
   * Creates a new `DecentralizedIdentifier` from its requisite parts.
   *
   * Use `DecentralizedIdentifier::parse` to obtain this from a direct did address.
   *
   * @param constructor The construction values
   */
  constructor(constructor: DecentralizedIdentifierConstructor) {
    this.clusterType = constructor.clusterType;
    this.authority = constructor.authority;
    this.fragment = constructor.fragment;
  }

  /**
   * Get the key to the DID data
   */
  dataAccount(): [PublicKey, number] {
    return findProgramAddress(this.authority);
  }

  legacyDataAccount(): [PublicKey, number] {
    return findLegacyProgramAddress(this.authority);
  }

  /**
   * Clones this
   */
  clone(): DidSolIdentifier {
    return new DidSolIdentifier({
      clusterType: this.clusterType,
      authority: this.authority,
      fragment: this.fragment,
    });
  }

  /**
   * Returns a new `DecentralizedIdentifier` but with `urlField` swapped to the parameter
   * @param urlField The new url field
   */
  withUrl(urlField: string): DidSolIdentifier {
    return new DidSolIdentifier({
      ...this,
      fragment: urlField,
    });
  }

  private get clusterString(): string {
    if (!this.clusterType) {
      return 'unknown:';
    }
    if (this.clusterType === 'mainnet-beta') {
      return '';
    }
    return `${this.clusterType}:`;
  }

  toString(includeURL = true): string {
    const path = ''; // TODO
    const query = ''; // TODO
    const fragment =
      !this.fragment || this.fragment === '' ? '' : `#${this.fragment}`;

    let urlExtension = '';
    if (includeURL) {
      urlExtension = `${path}${query}${fragment}`;
    }
    return `${DID_SOL_PREFIX}:${
      this.clusterString
    }${this.authority.toBase58()}${urlExtension}`;
  }

  // Note fragment is always the last field in the URI.
  // https://www.rfc-editor.org/rfc/rfc3986#section-3.5
  // TODO: Note, this REGEX is not robust towards URI spec, specifically paths and queries.
  // TODO add support for / urls and ? query params
  static REGEX = new RegExp(`^${DID_SOL_PREFIX}:?(\\w*):(\\w+)#?(\\w*)$`);

  /**
   * Parses a given did string
   * @param did the did string
   */
  static parse(did: string | VerificationMethod): DidSolIdentifier {
    if (isStringDID(did)) {
      const matches = DidSolIdentifier.REGEX.exec(did);

      if (!matches) throw new Error('Invalid DID');

      const authority = new PublicKey(matches[2]);

      return new DidSolIdentifier({
        clusterType: mapMethodExtension(matches[1]),
        authority,
        fragment: matches[3],
      });
    } else {
      throw new Error('Provided DID is not a string');
    }
  }

  parseFragmentFromId(id: string): string {
    // fragment self-reference.
    if (id.startsWith('#')) {
      return id.replace('#', '');
    }

    const didIdentifierPrefix = this.toString(false) + '#';
    if (id.startsWith(didIdentifierPrefix)) {
      return id.replace(didIdentifierPrefix, '');
    }

    throw new Error(`${id} does not conform to the DID spec`);
  }

  /**
   * Returns true if the did is valid
   * @param did The did string to check
   */
  static valid(did: string): boolean {
    try {
      DidSolIdentifier.parse(did);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parses an array of did strings
   * @param dids The did strings to parse
   */
  static parseMaybeArray(
    dids?: (string | VerificationMethod)[]
  ): DidSolIdentifier[] {
    return dids ? dids.map((v) => DidSolIdentifier.parse(v)) : [];
  }

  /**
   * Creates a new did
   * @param authority The authority and key of the did
   * @param clusterType The cluster the did points to
   * @param urlField An optional extra field
   */
  static create(
    authority: PublicKey,
    clusterType: ExtendedCluster | undefined,
    urlField?: string
  ): DidSolIdentifier {
    return new DidSolIdentifier({
      authority,
      clusterType,
      fragment: urlField,
    });
  }
}

export const mapMethodExtension = (
  clusterString: string
): ExtendedCluster | undefined => {
  switch (clusterString) {
    case '':
      return 'mainnet-beta';
    case 'devnet':
      return 'devnet';
    case 'testnet':
      return 'testnet';
    case 'localnet':
      return 'localnet';
    case 'civicnet':
      return 'civicnet';
  }
  // return undefined if not found
};
