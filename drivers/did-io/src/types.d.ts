type Driver = {};

declare module '@digitalbazaar/did-io' {
  class CachedResolver {
    get(options: { did: string }): any;

    generate(options: any): { didDocument: any, keyPairs: any, methodFor: Function };

    use(driver: Driver): void;
  }

  function findVerificationMethod(options: { doc: any, purpose: string }): any;

  return {
    CachedResolver
  }
}

declare module '@digitalbazaar/did-method-key' {
  function driver(): Driver;

  return {
    driver
  }
}
