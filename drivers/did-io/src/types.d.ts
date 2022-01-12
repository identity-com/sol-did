type Driver = {};

declare module '@digitalbazaar/did-io' {
  export class CachedResolver {
    get(options: { did: string }): any;

    generate(
      options: any
    ): { didDocument: any; keyPairs: any; methodFor: Function };

    use(driver: Driver): void;
  }

  export function findVerificationMethod(options: { doc: any; purpose: string }): any;
}

declare module '@digitalbazaar/did-method-key' {
  export function driver(): Driver;
}

declare module '@digitalbazaar/ed25519-verification-key-2018' {
  export class Ed25519VerificationKey2018 {
    id: string;
    controller: string;
    type: string;
    publicKeyBase58: string;
    privateKeyBase58?: string;

    static generate(): Promise<Ed25519VerificationKey2018>;
  }
}
