export const didDocComplete = {
  "@context": [
    "https://w3id.org/did/v1.0",
    "https://w3id.org/sol/v0"
  ],
  "controller": [
    "did:sol:localnet:LEGVfbHQ8VNuquHgWhHwZMKW4GMFemQWD13Vf3hY71a",
    "did:ethr:0x7C95f766498764e4b3eB1f7b96A7e6b34b8694A6"
  ],
  "verificationMethod": [
    {
      "id": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3#default",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3",
      "publicKeyBase58": "A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3"
    },
    {
      "id": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3#default",
      "type": "EcdsaSecp256k1RecoveryMethod2020",
      "controller": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3",
      "ethereumAddress": "0x7C95f766498764e4b3eB1f7b96A7e6b34b8694A6"
    },
    {
      "id": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3#default",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3",
      "publicKeyHex": "ad0dd2ba786be0b7f9da7881e86ae586d97e7a3eaf9fc8bac8983a9eb9570bee6c9ab544a04a4047d89860d75781f3791e9231b27e685e56131debbbf649606e"
    }
  ],
  "authentication": [],
  "assertionMethod": [],
  "keyAgreement": [],
  "capabilityInvocation": [
    "#default",
    "#eth-address",
    "#eth-key"
  ],
  "capabilityDelegation": [],
  "service": [
    {
      "id": "test871438247",
      "type": "testType871438247",
      "serviceEndpoint": "testEndpoint871438247"
    }
  ],
  "id": "did:sol:localnet:A2oYuurjzc8ACwQQN56SBLv1kUmYJJTBjwMNWVNgVaT3"
}

export const getGeneratedDidDocument = (didIdentifier: string, didMethodPrefix) => ({
  "@context": [
    "https://w3id.org/did/v1.0",
    "https://w3id.org/sol/v0"
  ],
  "controller": [],
  "verificationMethod": [
    {
      "id": `${didMethodPrefix}${didIdentifier}#default`,
      "type": "Ed25519VerificationKey2018",
      "controller": `${didMethodPrefix}${didIdentifier}`,
      "publicKeyBase58": didIdentifier
    }
  ],
  "authentication": [],
  "assertionMethod": [],
  "keyAgreement": [],
  "capabilityInvocation": [
    "#default",
  ],
  "capabilityDelegation": [],
  "service": [],
  "id": `${didMethodPrefix}${didIdentifier}`
})
