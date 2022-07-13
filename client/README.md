# SOL DID Client

A typescript client library for registering and resolving DIDs using [the 'sol' DID method](https://identity-com.github.io/sol-did/did-method-spec.html).

## Getting Started

### Command line tool

```shell
npm install @identity.com/sol-did-client
# or
yarn global add @identity.com/sol-did-client  
```

Then to resolve a DID document for a given DID: 
```shell
npx sol did:sol:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa
```

### Client library

```js
import {
  register, 
  resolve, 
  addKey, 
  removeKey, 
  addController, 
  removeController, 
  addService, 
  removeService
} from '@identity.com/sol-did-client';

// generate an X25519 key, eg using 'tweetnacl'
import nacl from 'tweetnacl';

const keyPair = nacl.sign.keyPair();

// register a DID
const did = await register({
  payer: keyPair.secretKey,
});

// resolve a DID
const document = await resolve(did);

// update a DID
const request = {
  payer: keyPair.secretKey,
  did,
  document: {
    service: [{
      description: 'Messaging Service',
      id: `${did}#service1`,
      serviceEndpoint: `https://dummmy.dummy/${did}`,
      type: 'Messaging',
    }],
  },
};
await update(request);

// deactivate a DID
await deactivate({
  payer: keyPair.secretKey,
  did,
});

// Add a key to the DID
addKey({
  payer: keyPair.secretKey,
  did,
  fragment: 'ledger',
  key
});

// Remove a key from the DID
removeKey({
  payer: keyPair.secretKey,
  did,
  fragment: 'ledger',
});

// Add a controller to the DID
addController({
  payer: keyPair.secretKey,
  did,
  controller,
});

// Remove a controller from the DID
removeController({
  payer: keyPair.secretKey,
  did,
  controller,
});

// Add a service to the DID
addService({
  payer: keyPair.secretKey,
  did,
  service: {
    id: `${did}#${fragment}`,
    type: 'Service',
    serviceEndpoint: `https://service.com/${did}`,
    description: 'Service'
  },
});

// Remove a service from the DID
removeService({
  payer: keyPair.secretKey,
  did,
  fragment,
});
```

## Contributing

Note: Before contributing to this project, please check out the code of conduct and contributing guidelines.

Sol-DID uses [nvm](https://github.com/nvm-sh/nvm) and [yarn](https://yarnpkg.com/)

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
yarn start-validator
```

In another shell:

```shell
yarn test-e2e
```
