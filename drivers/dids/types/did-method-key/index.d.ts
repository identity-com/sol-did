declare module 'did-method-key' {
  import {DIDDocument} from "did-resolver";
  type Driver = {
    keyToDidDoc: (properties: { publicKeyBase58: string }) => Promise<DIDDocument>;
    get: (properties: {did: string, url?: string}) => Promise<DIDDocument>;
  }

  function driver(): Driver;

  export default {
    driver,
  };
}
