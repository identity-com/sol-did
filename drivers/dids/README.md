# DIDS (Decentralized Identity library for Solana)

This library is a simple client library for generating DIDs for use with Solana applications.

It supports two DID methods:

- [did-key](https://w3c-ccg.github.io/did-method-key/): A static DID method based on 
X25519 ECC Curve keys, that are compatible with Solana public keys.
- [did-solid](https://identity-com.github.io/solid-did/did-method-spec.html): A Solana-native
DID method.
  
# Quick Start

To register a DID from a Solana public key:

```js
const DIDs = require('@identity.com/dids');
const dids = new DIDs({ payer: payerAccount.secretKey });

const owner = new Account().publicKey;
const keyIdentifier = await dids.register('key', owner);
const solidIdentifier = await dids.register('solid', owner);
```

To retrieve a DID document:

```js
const identifier = 'did:key:z6MkszyYuyjZ31XZKXT4qdb5HqsWjAZGZoVvGzsoX1Tnno9s';
const document = await dids.get(identifier);
```

For more examples, see tests/index.test.ts



## Testing & Development

Note: Before contributing to this project, please check out the code of conduct
and contributing guidelines.

DIDS uses [nvm](https://github.com/nvm-sh/nvm) and [yarn](https://yarnpkg.com/)

```shell
nvm i
yarn
```

### Running the tests

DIDS uses the mocha and chai test libraries

Run the tests using:

```shell
yarn test
```

Note: DIDS was bootstrapped and is packaged using [TSDX](https://tsdx.io/), which includes
Jest. Jest has a bug when importing some dependencies of this project, so mocha is used instead. 

### Repl

To test using the repl, run

```shell
yarn repl
```

Then try:

```js
await dids.register('solid', new Account().publicKey)
await dids.register('key', new Account().publicKey)

await dids.get('<YOUR IDENTIFIER HERE>')
```
