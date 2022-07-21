import { Keypair } from '@solana/web3.js';
import { promises as fsPromises } from 'fs';

const fixturePath = './tests/fixtures/';

export const loadJSON = async (filename: string): Promise<any> => {
  const fileBuffer = await fsPromises.readFile(
    `${fixturePath}documents/${filename}`
  );
  return JSON.parse(fileBuffer.toString());
};

export const loadKeypair = async (name: string): Promise<Keypair> => {
  const keyFileBuffer = await fsPromises.readFile(
    `${fixturePath}keypairs/${name}`
  );
  const privateKey = Uint8Array.from(JSON.parse(keyFileBuffer.toString()));
  return Keypair.fromSecretKey(privateKey);
};

export const getGeneratedDidDocument = (
  didIdentifier: string,
  didMethodPrefix: string
) => ({
  '@context': ['https://w3id.org/did/v1.0', 'https://w3id.org/sol/v2.0'],
  controller: [],
  verificationMethod: [
    {
      id: `${didMethodPrefix}${didIdentifier}#default`,
      type: 'Ed25519VerificationKey2018',
      controller: `${didMethodPrefix}${didIdentifier}`,
      publicKeyBase58: didIdentifier,
    },
  ],
  authentication: [],
  assertionMethod: [],
  keyAgreement: [],
  capabilityInvocation: ['#default'],
  capabilityDelegation: [],
  service: [],
  id: `${didMethodPrefix}${didIdentifier}`,
});
