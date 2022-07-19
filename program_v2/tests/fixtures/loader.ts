import { DIDDocument } from "did-resolver";
import { Keypair } from "@solana/web3.js";
import { promises as fsPromises } from "fs";

const fixturePath = "./tests/fixtures/";

export const loadDidDocComplete = async (): Promise<DIDDocument> => {
  const fileBuffer = await fsPromises.readFile(
    `${fixturePath}did-document-complete.json`
  );
  return JSON.parse(fileBuffer.toString()) as DIDDocument;
};

export const loadLegacyDidDocComplete = async (): Promise<DIDDocument> => {
  const fileBuffer = await fsPromises.readFile(
    `${fixturePath}legacy-did-document-complete.json`
  );
  return JSON.parse(fileBuffer.toString()) as DIDDocument;
};

export const loadKeypair = async (name: string): Promise<Keypair> => {
  const keyFileBuffer = await fsPromises.readFile(`${fixturePath}${name}`);
  const privateKey = Uint8Array.from(JSON.parse(keyFileBuffer.toString()));
  return Keypair.fromSecretKey(privateKey);
};

export const getGeneratedDidDocument = (
  didIdentifier: string,
  didMethodPrefix
) => ({
  "@context": ["https://w3id.org/did/v1.0", "https://w3id.org/sol/v0"],
  controller: [],
  verificationMethod: [
    {
      id: `${didMethodPrefix}${didIdentifier}#default`,
      type: "Ed25519VerificationKey2018",
      controller: `${didMethodPrefix}${didIdentifier}`,
      publicKeyBase58: didIdentifier,
    },
  ],
  authentication: [],
  assertionMethod: [],
  keyAgreement: [],
  capabilityInvocation: ["#default"],
  capabilityDelegation: [],
  service: [],
  id: `${didMethodPrefix}${didIdentifier}`,
});
