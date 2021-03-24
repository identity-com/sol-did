declare module '@digitalbazaar/ed25519-verification-key-2020' {
  import {LDKeyPair} from "crypto-ld";

  class Ed25519VerificationKey2020 extends LDKeyPair {
    export(options: { publicKey?: boolean, privateKey?: boolean}):{ privateKeyMultibasw?: string, publicKeyMultibase: string }
  }

  export { Ed25519VerificationKey2020 }
}
