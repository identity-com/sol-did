import { DIDDocument, VerificationMethod, ServiceEndpoint } from 'did-resolver';
import { getSolContextPrefix, W3ID_CONTEXT, SOLANA_MAINNET } from './lib/const';
import { DidDataAccount, DidSolUpdateArgs, Service } from './lib/types';
import { PublicKey } from '@solana/web3.js';
import { DidSolIdentifier } from './DidSolIdentifier';
import {
  defaultVerificationMethod,
  mapControllers,
  mapServices,
  mapVerificationMethodsToDidComponents,
} from './lib/utils';
import { ExtendedCluster } from './lib/connection';

export class DidSolDocument implements DIDDocument {
  // private identifier: DidSolIdentifier;

  public '@context'?: 'https://www.w3.org/ns/did/v1' | string | string[] =
    DidSolDocument.defaultContext();
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
    Object.assign(
      this,
      mapVerificationMethodsToDidComponents(
        [defaultVerificationMethod(identifier.authority)],
        identifier
      )
    );
  }

  static defaultContext(version: string = '2.0'): string[] {
    return [W3ID_CONTEXT, getSolContextPrefix(version)];
  }

  static sparse(identifier: DidSolIdentifier): DidSolDocument {
    return new DidSolDocument(identifier);
  }

  static from(
    account: DidDataAccount,
    clusterType: ExtendedCluster = SOLANA_MAINNET
  ): DidSolDocument {
    const identifier = new DidSolIdentifier({
      authority: new PublicKey(account.initialVerificationMethod.keyData),
      clusterType,
    });
    const doc = DidSolDocument.sparse(identifier);
    // VM related
    const allVerificationMethods = [account.initialVerificationMethod].concat(
      account.verificationMethods
    );
    Object.assign(
      doc,
      mapVerificationMethodsToDidComponents(allVerificationMethods, identifier)
    );
    // Services
    doc.service = mapServices(account.services, identifier);
    // Controllers
    doc.controller = mapControllers(
      account.nativeControllers,
      account.otherControllers,
      clusterType
    );
    return doc;
  }

  static docToUpdateArgs(document: DIDDocument): DidSolUpdateArgs {
    const args: DidSolUpdateArgs = {
      controllerDIDs: [],
      verificationMethods: [],
      services: [],
    };

    const didSolIdentifier = DidSolIdentifier.parse(document.id);
    // TODO: Make sure it matches the given path.

    // Controllers
    if (document.controller) {
      if (Array.isArray(document.controller)) {
        args.controllerDIDs = document.controller;
      } else {
        args.controllerDIDs = [document.controller];
      }
    }

    // Services
    if (document.service) {
      document.service.map((service): Service => {
        return {
          fragment: didSolIdentifier.parseFragmentFromId(service.id),
          serviceType: service.type,
          serviceEndpoint: service.serviceEndpoint,
        };
      });
    }

    // TODO implement
    // if (document.controller) {
    //   args.nativeControllers = document.controller instanceof Array
    //     ? document.controller
    //     : [document.controller];
    // }
    // if (document.verificationMethod) {
    //   args.verificationMethods = document.verificationMethod instanceof Array
    //     ? document.verificationMethod
    //     : [document.verificationMethod];
    // }
    // if (document.service) {
    //   args.services = document.service instanceof Array
    //     ? document.service
    //     : [document.service];
    // }
    return args;
  }


}
