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
