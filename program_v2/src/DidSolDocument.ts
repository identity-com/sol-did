import { DIDDocument, VerificationMethod, ServiceEndpoint } from "did-resolver";
import { getSolContextPrefix, W3ID_CONTEXT, SOLANA_MAINNET } from "./lib/const";
import { DidDataAccount } from "./lib/types";
import { PublicKey } from "@solana/web3.js";
import { DidSolIdentifier } from "./DidSolIdentifier";
import { defaultVerificationMethod, mapServices, mapVerificationMethodsToDidComponents } from "./lib/utils";
import { ExtendedCluster } from "./lib/connection";

export class DidSolDocument implements DIDDocument {
  // private identifier: DidSolIdentifier;

  public '@context'?: 'https://www.w3.org/ns/did/v1' | string | string[] = DidSolDocument.defaultContext();
  public id: string;
  public alsoKnownAs?: string[];
  public controller?: string | string[] = [];
  public verificationMethod?: VerificationMethod[] = [];
  public authentication?: (string | VerificationMethod)[] = [];
  public assertionMethod?: (string | VerificationMethod)[] = [];
  public keyAgreement?: (string | VerificationMethod)[] = [];
  public capabilityInvocation?: (string | VerificationMethod)[] = [];
  public capabilityDelegation?: (string | VerificationMethod)[] = [];
  public service?: ServiceEndpoint[] = [];

  constructor(identifier: DidSolIdentifier) {
    this.id = identifier.toString();

    // default to generative case
    Object.assign(this, mapVerificationMethodsToDidComponents([defaultVerificationMethod(identifier.authority)], identifier));
  }

  static defaultContext(version: number = 0): string[] {
    return [W3ID_CONTEXT, getSolContextPrefix(version)];
  }

  static sparse(identifier: DidSolIdentifier): DidSolDocument {
    return new DidSolDocument(identifier);
  }

  static from(account: DidDataAccount, clusterType: ExtendedCluster = SOLANA_MAINNET): DidSolDocument {
    const identifier = new DidSolIdentifier({
      authority: new PublicKey(account.initialVerificationMethod.keyData),
      clusterType,
    })
    const doc = DidSolDocument.sparse(identifier);
    // VM related
    const allVerificationMethods = [account.initialVerificationMethod].concat(account.verificationMethods);
    Object.assign(doc, mapVerificationMethodsToDidComponents(allVerificationMethods, identifier));
    // Services
    doc.service = mapServices(account.services);
    return doc;
  }
}