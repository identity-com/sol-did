type Suite = {}
type Options = {}

declare module 'crypto-ld' {
  class LDKeyPair {
    static from(options: Options):Promise<LDKeyPair>
    static fromFingerprint(options: { fingerprint: String }):LDKeyPair
    static suite: string

    publicKeyBase58: string
    privateKeyBase58?: string
    fingerprint(): string
    export(options: { publicKey?: boolean, privateKey?: boolean}):any
  }

  class CryptoLD {
    use(keyPairLib: typeof LDKeyPair)
    from(options: Options):Promise<LDKeyPair>
  }

  export { LDKeyPair, CryptoLD }
}
