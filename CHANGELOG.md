# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Allow to initialize `DidService` with a `did:` string

### Changed
- Updated `updateFromDoc` to expect a generalized `DidDocument` and not a `DidSolDocument`
- Updated `anchor-lang` dependency to `0.26.0`
- Updated program Solana dependencies to latest version.

### Deprecated

### Removed

### Fixed
- Prevent Lockout on generalized `update()` function

### Security


## [3.2.0] - 2022-10-20
### Added
- Implemented `::try_from` on `DidAccount` to easily support generative and non-generative integrations
- Added generative method on `DidSolDataAccount` class for simple integration of `null` case.
- Added required `Cargo.toml` package data for `sol-did` publication on crates.io.

### Changed
- Removed `publicKey: string;` from `EthSigner` interface. This makes it compatible with
  `class JsonRpcSigner extends Signer` of `ethers`.
- Filter methods on `DidAccount` verificationmethods are not public.
- `DidSolError` is now public.
- Fixed resolve error when setting verificationmethod flags

### Deprecated

### Removed
- Removed legacy codebase (did:sol v1) from repository.

### Fixed

### Security

## [3.1.4] - 2022-10-20
### Added
- Provided `pub fn eth_verify_message` as a public utility method to verify eth signed messages.
- expose additional modules for integration (constants, legacy, utils)
- Updated spec link to `http://g.identity.com/sol-did`
- Added Martin Riedel as an author

### Changed
- Updated `is_authority` and `find_authority` function signatures to not perform secp256k1 verification anymore.

### Fixed
- replaced [BN](https://github.com/indutny/bn.js/) .toBuffer() usage that was not working properly in browser.


## [3.1.2] - 2022-09-23
### Changed
- Removed `ethers` dependency to reduce package size.

## [3.1.1] - 2022-09-22
### Fixed
- Legacy DID Migration did not work for "inferred" CapabilityInvocation on the "default" VerificationMethod
- `migrate()` operation did not close the legacy account after migration when an legacyAuthority was specified


## [3.1.0] - 2022-09-19
### Added
- Restructured npm packages to be a single `yarn` workspace under [sol-did](./sol-did/package.json)
- `DidSolService` allows to chain multiple "general" operations
- Expose `crate::integrations::is_authority` to check if a key is an authority on a DID.

### Changed
- **Breaking**: `getDidAccount()` now returns a clearer data model for a Verification Method and not the raw on-chain version
- **Breaking**: `addVerificationMethod` and `setVerificationMethodFlags` now accept `flags` as an array of `BitwiseVerificationMethodFlag`
- **Breaking**: Updated `DidSolService.build()` Builder interface signature.
- **Breaking**: `addService` operation takes an additional `allowsOverwrite` flag to allow an update of an existing service without removing it first.
- Client operations with `authority` and `payer` default to `this._wallet.publicKey` and not `this._didAuthority`
- Do not download the IDL from the network, but use the library IDL instead.
- `DidSolService.build` is not `async` anymore. Therefore it does not need to be awaited

### Deprecated

### Removed
- `build()` on DidSolService instance. Use static version instead.

### Fixed
- `getDidAccount()` tolerates existing accounts with No data.

### Security


## [3.0.0] - 2022-08-01
Initial release for the anchor rewrite and feature extended `did:sol method`
