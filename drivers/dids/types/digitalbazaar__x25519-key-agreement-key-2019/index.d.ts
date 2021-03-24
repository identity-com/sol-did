declare module '@digitalbazaar/x25519-key-agreement-key-2019' {
  import {LDKeyPair} from "crypto-ld";

  class X25519KeyAgreementKey2019 extends LDKeyPair {
    export(options: { publicKey?: boolean, privateKey?: boolean}):{ privateKeyBase58?: string, publicKeyBase58: string }
  }

  export { X25519KeyAgreementKey2019 }
}
