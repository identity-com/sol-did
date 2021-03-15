# SOLID DID Client

A typescript client library for registering and resolving DIDs using the SOLID method

## Getting Started


### Command line tool

```shell
yarn global add @identity.com/solid-did-client # or npm install -g @identity.com/solid-did-client
solid did:solid:devnet:HxzSJWiK9R4bpRu2YPgg47s2x2D4zT8AK5ziqoQqkzAo
```

### Client library

```js
import { register, resolve } from '@identity.com/solid-did-client';

// generate an X25519 key, eg using 'tweetnacl'
import nacl from 'tweetnacl';

const keyPair = nacl.sign.keyPair();

// register a DID
const identifier = await register({
  payer: keyPair.secretKey,
});

// resolve a DID
const document = await resolve(identifier);

// update a DID
const request = {
  payer: keyPair.secretKey,
  identifier,
  document: {
    service: [{
      description: 'Messaging Service',
      id: `${identifier}#service1`,
      serviceEndpoint: `https://dummmy.dummy/${identifier}`,
      type: 'Messaging',
    }],
  },
};
await update(request);

// deactivate a DID
await deactivate({
  payer: keyPair.secretKey,
  identifier: did,
});
```

## Contributing

Note: Before contributing to this project, please check out the code of conduct
and contributing guidelines.

Solid-DID uses [nvm](https://github.com/nvm-sh/nvm) and [yarn](https://yarnpkg.com/)

```shell
nvm i
yarn
```

## Running the tests

### Unit tests

```shell
yarn test
```

### E2E tests

Install Solana locally by following the steps described [here](https://docs.solana.com/cli/install-solana-cli-tools).

In one shell, run:

```shell
yarn build-program
yarn start-test-validator
```

In another shell:

```shell
yarn test-e2e
```
