# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Restructured npm packages to be a single `yarn` workspace under [sol-did](./sol-did/package.json)
- `DidSolService` allows to chain multiple "general" operations

### Changed
- **Breaking**: `getDidAccount()` now returns a clearer data model for a Verification Method and not the raw on-chain version
- **Breaking**: `addVerificationMethod` and `setVerificationMethodFlags` now accept `flags` as an array of `BitwiseVerificationMethodFlag`
- **Breaking**: Updated `DidSolService.build()` Builder interface signature.
- **Breaking**: `addService` operation takes an additional `allowsOverwrite` flag to allow an update of an existing service without removing it first.
- Client operations with `authority` and `payer` default to `this._wallet.publicKey` and not `this._didAuthority`
- Do not download the IDL from the network, but use the library IDL instead.

### Deprecated

### Removed

### Fixed
- `getDidAccount()` tolerates existing accounts with No data.

### Security


## [3.0.0] - 2022-08-01
Initial release for the anchor rewrite and feature extended `did:sol method`
