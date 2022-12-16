import * as anchor from '@project-serum/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { SolDid, IDL } from '@identity.com/sol-did-idl';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { getAddress } from '@ethersproject/address';
import { hexlify, arrayify } from '@ethersproject/bytes';
import { decode } from 'bs58';
import { VerificationMethod as ResolverVerificationMethod } from 'did-resolver';

import {
  Bytes,
  DidVerificationMethodComponents,
  EthSigner,
  PrivateKey,
  Service,
  BitwiseVerificationMethodFlag,
  VerificationMethodType,
} from './types';
import {
  DEFAULT_KEY_ID,
  DEFAULT_SEED_STRING,
  DID_SOL_PREFIX,
  DID_SOL_PROGRAM,
  LEGACY_DID_SOL_PROGRAM,
  VALID_DID_REGEX,
} from './const';
import {
  ServiceEndpoint as DidService,
  VerificationMethod as DidVerificationMethod,
} from 'did-resolver';
import { DidSolIdentifier } from '../DidSolIdentifier';
import { ExtendedCluster } from './connection';
import { VerificationMethod } from './wrappers';

export const fetchProgram = (provider: Provider): Program<SolDid> => {
  let idl;
  // Download IDL from the network.
  // idl = await Program.fetchIdl<SolDid>(DID_SOL_PROGRAM, provider);
  idl = IDL; // default from package

  return new Program<SolDid>(idl, DID_SOL_PROGRAM, provider) as Program<SolDid>;
};

export const findProgramAddress = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING), authority.toBuffer()],
    DID_SOL_PROGRAM
  );

export const findLegacyProgramAddress = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [authority.toBuffer(), anchor.utils.bytes.utf8.encode('sol')],
    LEGACY_DID_SOL_PROGRAM
  );

export const ethSignPayload = async (
  instruction: TransactionInstruction,
  nonce: anchor.BN,
  signer: EthSigner
): Promise<TransactionInstruction> => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const nonceBytes = Buffer.from(nonce.toArray('le', 8));
  const message = Buffer.concat([instruction.data.subarray(8, -1), nonceBytes]);

  const signatureFull = await signer.signMessage(message);
  // add signature to payload
  const signatureBytes = arrayify(signatureFull);
  const signature = Array.from(signatureBytes.slice(0, -1));
  // // map [0x1b, 0x1c] to [0, 1]
  // https://docs.ethers.io/v4/api-utils.html#signatures
  // @ts-ignore // can never be 0
  const recoveryId = signatureBytes.at(-1) - 27;

  // const rawMessage = concat([
  //   toUtf8Bytes(messagePrefix),
  //   toUtf8Bytes(String(message.length)),
  //   message
  // ])
  // const hash = ethersUtils.hashMessage(message);
  // console.log(`rawMessage: ${ethersUtils.hexlify(rawMessage)} length: ${rawMessage.length}`)
  // console.log(`message: ${ethersUtils.hexlify(message)} length: ${message.length}`)
  // console.log(`hash: ${ethersUtils.hexlify(hash)} hash: ${hash.length}`)
  // console.log(`signature: ${ethersUtils.hexlify(signature)} length: ${signature.length}`)
  // console.log(`recoveryId: ${ethersUtils.hexlify(recoveryId)}`)
  // console.log("Eth Address: ", ethersUtils.arrayify(signer.address))
  // console.log("Eth Address (full): ", ethersUtils.arrayify(signer.publicKey))
  // const recPubKey = ethersUtils.verifyMessage(message, signature)
  // console.log("Recovered Eth Address (full): ", ethersUtils.arrayify(recPubKey))

  // update data & return instruction
  instruction.data = Buffer.concat([
    instruction.data.slice(0, -1), // Remove Option<T> == None
    new Uint8Array([1]), // Add Option<T> == Some
    new Uint8Array(signature),
    new Uint8Array([recoveryId]),
  ]);
  // return { signature, recoveryId };

  return instruction;
};

export const isValidDid = (did: string): boolean => VALID_DID_REGEX.test(did);
export const isDidSol = (did: string): boolean =>
  did.startsWith(DID_SOL_PREFIX);

export const validateAndSplitControllers = (controllerDids: string[]) => {
  if (controllerDids.some((did) => !isValidDid(did))) {
    throw new Error('Invalid DID found in controllers');
  }

  const nativeControllers: PublicKey[] = [];
  const otherControllers: string[] = [];
  controllerDids.forEach((did) => {
    if (isDidSol(did)) {
      const id = DidSolIdentifier.parse(did);
      nativeControllers.push(id.authority);
    } else {
      otherControllers.push(did);
    }
  });

  return {
    nativeControllers,
    otherControllers,
  };
};

export const defaultVerificationMethod = (
  authority: PublicKey
): VerificationMethod =>
  VerificationMethod.from({
    fragment: DEFAULT_KEY_ID,
    methodType: VerificationMethodType.Ed25519VerificationKey2018,
    flags:
      BitwiseVerificationMethodFlag.CapabilityInvocation |
      BitwiseVerificationMethodFlag.OwnershipProof,
    keyData: authority.toBuffer(),
  });

// Note: BitwiseVerificationMethodFlag.OwnershipProof is not mapped to DID components
export const mapVerificationMethodsToDidComponents = (
  methods: VerificationMethod[],
  identifier: DidSolIdentifier
): DidVerificationMethodComponents => {
  const didComponents: DidVerificationMethodComponents = {
    verificationMethod: new Array<DidVerificationMethod>(),
    authentication: new Array<string>(),
    assertionMethod: new Array<string>(),
    keyAgreement: new Array<string>(),
    capabilityInvocation: new Array<string>(),
    capabilityDelegation: new Array<string>(),
  };

  for (const method of methods) {
    // skip hidden methods
    if (method.flags.has(BitwiseVerificationMethodFlag.DidDocHidden)) {
      continue;
    }
    if (method.flags.has(BitwiseVerificationMethodFlag.Authentication)) {
      didComponents.authentication.push(
        `${identifier.toString()}#${method.fragment}`
      );
    }
    if (method.flags.has(BitwiseVerificationMethodFlag.Assertion)) {
      didComponents.assertionMethod.push(
        `${identifier.toString()}#${method.fragment}`
      );
    }
    if (method.flags.has(BitwiseVerificationMethodFlag.KeyAgreement)) {
      didComponents.keyAgreement.push(
        `${identifier.toString()}#${method.fragment}`
      );
    }
    if (method.flags.has(BitwiseVerificationMethodFlag.CapabilityInvocation)) {
      didComponents.capabilityInvocation.push(
        `${identifier.toString()}#${method.fragment}`
      );
    }
    if (method.flags.has(BitwiseVerificationMethodFlag.CapabilityDelegation)) {
      didComponents.capabilityDelegation.push(
        `${identifier.toString()}#${method.fragment}`
      );
    }

    let vm: DidVerificationMethod = {
      id: identifier.withUrl(method.fragment).toString(),
      type: VerificationMethodType[method.methodType],
      controller: identifier.toString(),
    };

    switch (method.methodType) {
      case VerificationMethodType.Ed25519VerificationKey2018:
        vm.publicKeyBase58 = new PublicKey(method.keyData).toBase58();
        break;
      case VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020:
        vm.ethereumAddress = getAddress(hexlify(method.keyData));
        break;
      case VerificationMethodType.EcdsaSecp256k1VerificationKey2019:
        vm.publicKeyHex = hexlify(method.keyData).replace('0x', '');
        break;
      default:
        throw new Error(
          `Verification method type '${method.methodType}' not recognized`
        );
    }

    didComponents.verificationMethod.push(vm);
  }

  return didComponents;
};

export const mapServices = (
  services: Service[],
  identifier: DidSolIdentifier
): DidService[] =>
  services.map((service) => ({
    id: `${identifier.toString()}#${service.fragment}`,
    type: service.serviceType,
    serviceEndpoint: service.serviceEndpoint,
  }));

export const mapControllers = (
  nativeControllers: PublicKey[],
  otherControllers: string[],
  clusterType: ExtendedCluster | undefined
): string[] => {
  return [
    ...nativeControllers.map((key) =>
      DidSolIdentifier.create(key, clusterType).toString()
    ),
    ...otherControllers,
  ];
};

export const getBinarySize = (input: string): number =>
  Buffer.byteLength(input, 'utf8');

export const privateKeyIsArray = (
  privateKey: PrivateKey
): privateKey is number[] => Array.isArray(privateKey);
export const privateKeyIsString = (
  privateKey: PrivateKey
): privateKey is string => typeof privateKey === 'string';
export const privateKeyIsBuffer = (
  privateKey: PrivateKey
): privateKey is Buffer => Buffer.isBuffer(privateKey);
export const privateKeyIsUint8Array = (
  privateKey: PrivateKey
): privateKey is Uint8Array => privateKey instanceof Uint8Array;

/**
 * Create a Solana account object from an x25519 private key
 * @param privateKey
 */
export const makeKeypair = (privateKey: PrivateKey): Keypair => {
  if (privateKeyIsArray(privateKey)) {
    return Keypair.fromSecretKey(Buffer.from(privateKey));
  }
  if (privateKeyIsBuffer(privateKey) || privateKeyIsUint8Array(privateKey))
    return Keypair.fromSecretKey(privateKey);
  if (privateKeyIsString(privateKey)) {
    const privateKeyHex = decode(privateKey);
    return Keypair.fromSecretKey(privateKeyHex);
  }

  throw new Error('Incompatible private key format');
};

/**
 * Given a private key on the x25519 curve, get its public key
 * @param privateKey
 */
export const getPublicKey = (privateKey: PrivateKey): PublicKey =>
  makeKeypair(privateKey).publicKey;

export const getKeyDataFromVerificationMethod = (
  vm: DidVerificationMethod
): Bytes => {
  switch (vm.type) {
    case VerificationMethodType[
      VerificationMethodType.Ed25519VerificationKey2018
    ]:
      return new PublicKey(vm.publicKeyBase58 as string).toBuffer();
    case VerificationMethodType[
      VerificationMethodType.EcdsaSecp256k1RecoveryMethod2020
    ]:
      return Buffer.from(arrayify(vm.ethereumAddress as string));
    case VerificationMethodType[
      VerificationMethodType.EcdsaSecp256k1VerificationKey2019
    ]:
      return Buffer.from(arrayify(vm.publicKeyHex as string));
    default:
      throw new Error(`Verification method type '${vm.type}' not recognized`);
  }
};

export const isStringDID = (
  identifier: ResolverVerificationMethod | DidSolIdentifier | string
): identifier is string => typeof identifier === 'string';
