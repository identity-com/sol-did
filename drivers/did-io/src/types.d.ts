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

declare module '@digitalbazaar/ed25519-verification-key-2018' {
  class Ed25519VerificationKey2018 {
    id: string;
    controller: string;
    type: string;
    publicKeyBase58: string;
    privateKeyBase58?: string;

    static generate(): Promise<Ed25519VerificationKey2018>;
  }

  return {
    Ed25519VerificationKey2018
  }
}
