
declare module '@digitalbazaar/did-io' {
  import { DIDDocument } from 'did-resolver';

  type Driver = {};

  export class CachedResolver {
    get(options: { did?: string; url?: string }): any;

    generate(
      options: any
    ): Promise<{
      didDocument: DIDDocument;
      keyPairs: Map<string, any>;
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
