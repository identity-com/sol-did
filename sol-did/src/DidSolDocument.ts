import {
  DIDDocument,
  ServiceEndpoint,
  VerificationMethod as DidVerificationMethod,
} from 'did-resolver';
import { getSolContextPrefix, W3ID_CONTEXT } from './lib/const';
import {
  DidSolUpdateArgs,
  Service,
  VerificationMethod,
  VerificationMethodFlags,
  VerificationMethodType,
} from './lib/types';
import { DidSolIdentifier } from './DidSolIdentifier';
import {
  defaultVerificationMethod,
  getKeyDataFromVerificationMethod,
  mapServices,
  mapVerificationMethodsToDidComponents,
} from './lib/utils';
import { DidSolDataAccount } from './DidSolDataAccount';

/**
 * A class representing a did:sol document
 * The document is less permissive than the DIDDocument specification that it implements.
 */
export class DidSolDocument implements DIDDocument {
  // private identifier: DidSolIdentifier;

  public '@context'?: 'https://www.w3.org/ns/did/v1' | string | string[] =
    DidSolDocument.defaultContext();
  public id: string;
  // public alsoKnownAs?: string[];
  public controller?: string[] = [];
  public verificationMethod?: DidVerificationMethod[] = [];
  public authentication?: string[] = [];
  public assertionMethod?: string[] = [];
  public keyAgreement?: string[] = [];
  public capabilityInvocation?: string[] = [];
  public capabilityDelegation?: string[] = [];
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

  static from(account: DidSolDataAccount): DidSolDocument {
    const doc = DidSolDocument.sparse(account.identifier);
    // VM related
    Object.assign(
      doc,
      mapVerificationMethodsToDidComponents(
        account.verificationMethods,
        account.identifier
      )
    );
    // Services
    doc.service = mapServices(account.services, account.identifier);
    // Controllers
    doc.controller = account.controllers;
    return doc;
  }

  static fromDoc(document: DIDDocument): DidSolDocument {
    const didSolDocument = new DidSolDocument(
      DidSolIdentifier.parse(document.id)
    );
    // check requirements
    if (document.controller && !Array.isArray(document.controller)) {
      throw new Error('DIDDocument.controller must be an string array');
    }

    if (
      document.authentication &&
      !document.authentication.every((id) => typeof id === 'string')
    ) {
      throw new Error('DIDDocument.authentication must be an string array');
    }

    if (
      document.assertionMethod &&
      !document.assertionMethod.every((id) => typeof id === 'string')
    ) {
      throw new Error('DIDDocument.assertionMethod must be an string array');
    }

    if (
      document.keyAgreement &&
      !document.keyAgreement.every((id) => typeof id === 'string')
    ) {
      throw new Error('DIDDocument.keyAgreement must be an string array');
    }

    if (
      document.capabilityInvocation &&
      !document.capabilityInvocation.every((id) => typeof id === 'string')
    ) {
      throw new Error(
        'DIDDocument.capabilityInvocation must be an string array'
      );
    }

    if (
      document.capabilityDelegation &&
      !document.capabilityDelegation.every((id) => typeof id === 'string')
    ) {
      throw new Error(
        'DIDDocument.capabilityDelegation must be an string array'
      );
    }

    Object.assign(didSolDocument, document);
    return didSolDocument;
  }

  getDocUpdateArgs(): DidSolUpdateArgs {
    const args: DidSolUpdateArgs = {
      controllerDIDs: [],
      verificationMethods: [],
      services: [],
    };

    const didSolIdentifier = DidSolIdentifier.parse(this.id);

    // Controllers
    if (this.controller) {
      args.controllerDIDs = this.controller;
    }

    // Services
    if (this.service) {
      args.services = this.service.map((service): Service => {
        return {
          fragment: didSolIdentifier.parseFragmentFromId(service.id),
          serviceType: service.type,
          serviceEndpoint: service.serviceEndpoint,
        };
      });
    }

    // Verification Methods
    if (this.verificationMethod) {
      args.verificationMethods = this.verificationMethod.map(
        (vm: DidVerificationMethod): VerificationMethod =>
          this.mapVerificationMethod(vm)
      );
    }

    return args;
  }

  getFlagsFromVerificationMethod(fragment: string): VerificationMethodFlags {
    let flags = VerificationMethodFlags.None;

    if (
      this.authentication &&
      this.authentication.find((id) => id.endsWith(`#${fragment}`))
    ) {
      flags |= VerificationMethodFlags.Authentication;
    }

    if (
      this.assertionMethod &&
      this.assertionMethod.find((id) => id.endsWith(`#${fragment}`))
    ) {
      flags |= VerificationMethodFlags.Assertion;
    }

    if (
      this.keyAgreement &&
      this.keyAgreement.find((id) => id.endsWith(`#${fragment}`))
    ) {
      flags |= VerificationMethodFlags.KeyAgreement;
    }

    if (
      this.capabilityInvocation &&
      this.capabilityInvocation.find((id) => id.endsWith(`#${fragment}`))
    ) {
      flags |= VerificationMethodFlags.CapabilityInvocation;
    }

    if (
      this.capabilityDelegation &&
      this.capabilityDelegation.find((id) => id.endsWith(`#${fragment}`))
    ) {
      flags |= VerificationMethodFlags.CapabilityDelegation;
    }

    return flags;
  }

  /**
   * Map a DidVerificationMethod to a compressed did:sol VerificationMethod with flags.
   * @param vm DidVerificationMethod to map
   */
  mapVerificationMethod(vm: DidVerificationMethod): VerificationMethod {
    const id = DidSolIdentifier.parse(this.id);

    const methodType =
      VerificationMethodType[vm.type as keyof typeof VerificationMethodType];
    if (methodType === undefined) {
      throw new Error(`Unknown verification method type '${vm.type}'`);
    }

    const fragment = id.parseFragmentFromId(vm.id);
    const flags = this.getFlagsFromVerificationMethod(fragment);
    const keyData = getKeyDataFromVerificationMethod(vm);

    return {
      fragment,
      methodType,
      flags,
      keyData,
    };
  }
}
