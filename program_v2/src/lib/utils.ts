import * as anchor from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { utils as ethersUtils } from "ethers/lib/ethers";
import {
  DidVerificationMethodComponents,
  EthSigner,
  Service,
  VerificationMethod,
  VerificationMethodFlags,
  VerificationMethodType,
} from "./types";
import {
  DEFAULT_KEY_ID,
  DEFAULT_SEED_STRING,
  DID_SOL_PREFIX,
  DID_SOL_PROGRAM,
  VALID_DID_REGEX,
} from "./const";
import {
  VerificationMethod as DidVerificationMethod,
  ServiceEndpoint as DidService,
} from "did-resolver";
import { DidSolIdentifier } from "../DidSolIdentifier";
import { ExtendedCluster } from "./connection";

export const fetchProgram = async (
  provider: Provider
): Promise<Program<SolDid>> => {
  const idl = await Program.fetchIdl<SolDid>(DID_SOL_PROGRAM, provider);

  if (!idl) throw new Error("Notification IDL could not be found");

  return new Program<SolDid>(idl, DID_SOL_PROGRAM, provider) as Program<SolDid>;
};

export const findProgramAddress = async (authority: PublicKey) =>
  PublicKey.findProgramAddress(
    [anchor.utils.bytes.utf8.encode(DEFAULT_SEED_STRING), authority.toBuffer()],
    DID_SOL_PROGRAM
  );

export const ethSignPayload = async (
  instruction: TransactionInstruction,
  nonce: anchor.BN,
  signer: EthSigner
): Promise<TransactionInstruction> => {
  // Anchor 8 bytes prefix, Option<T> byte suffix
  const nonceBytes = nonce.toBuffer("le", 8);
  const message = Buffer.concat([instruction.data.subarray(8, -1), nonceBytes]);

  const signatureFull = await signer.signMessage(message);
  // add signature to payload
  const signatureBytes = ethersUtils.arrayify(signatureFull);
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
    throw new Error("Invalid DID found in controllers");
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
): VerificationMethod => ({
  fragment: DEFAULT_KEY_ID,
  methodType: VerificationMethodType.Ed25519VerificationKey2018,
  flags:
    VerificationMethodFlags.CapabilityInvocation |
    VerificationMethodFlags.OwnershipProof,
  keyData: authority.toBuffer(),
});

// Note: VerificationMethodFlags.OwnershipProof is not mapped to DID components
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
    if (
      (method.flags & VerificationMethodFlags.DidDocHidden) ===
      VerificationMethodFlags.DidDocHidden
    ) {
      continue;
    }
    if (
      (method.flags & VerificationMethodFlags.Authentication) ===
      VerificationMethodFlags.Authentication
    ) {
      didComponents.authentication.push(`#${method.fragment}`);
    }
    if (
      (method.flags & VerificationMethodFlags.Assertion) ===
      VerificationMethodFlags.Assertion
    ) {
      didComponents.assertionMethod.push(`#${method.fragment}`);
    }
    if (
      (method.flags & VerificationMethodFlags.KeyAgreement) ===
      VerificationMethodFlags.KeyAgreement
    ) {
      didComponents.keyAgreement.push(`#${method.fragment}`);
    }
    if (
      (method.flags & VerificationMethodFlags.CapabilityInvocation) ===
      VerificationMethodFlags.CapabilityInvocation
    ) {
      didComponents.capabilityInvocation.push(`#${method.fragment}`);
    }
    if (
      (method.flags & VerificationMethodFlags.CapabilityDelegation) ===
      VerificationMethodFlags.CapabilityDelegation
    ) {
      didComponents.capabilityDelegation.push(`#${method.fragment}`);
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
        vm.ethereumAddress = ethersUtils.getAddress(
          ethersUtils.hexlify(method.keyData)
        );
        break;
      case VerificationMethodType.EcdsaSecp256k1VerificationKey2019:
        vm.publicKeyHex = ethersUtils.hexlify(method.keyData).replace("0x", "");
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

export const mapServices = (services: Service[]): DidService[] =>
  services.map((service) => ({
    id: `#${service.fragment}`,
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
  Buffer.byteLength(input, "utf8");
