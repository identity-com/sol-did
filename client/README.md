# SOLID DID Client

A typescript client library for registering and resolving DIDs using the SOLID method

## Getting started

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
