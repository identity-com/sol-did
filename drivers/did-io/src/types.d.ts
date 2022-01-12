type Driver = {};

declare module '@digitalbazaar/did-io' {
  import { DIDDocument } from 'did-resolver';

  export class CachedResolver {
    get(options: { did?: string; url?: string }): any;

    generate(
      options: any
    ): Promise<{
      didDocument: DIDDocument;
      keyPairs: Map;
      methodFor: Function;
    }>;

    use(driver: Driver): void;
  }

  export function findVerificationMethod(options: {
    doc: DIDDocument;
    purpose?: string;
    methodId?: string;
  }): any;
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
