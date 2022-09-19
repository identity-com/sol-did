import { Command } from '@oclif/core';
import { DidSolIdentifier } from '@identity.com/sol-did-client';
import { DidSolService } from '@identity.com/sol-did-client';

export default class Resolve extends Command {
  static description = 'Resolves a did:sol DID';

  static examples = [
    `$ sol resolve did:sol:devnet:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa
{
  "@context": [
    "https://w3id.org/did/v1.0",
    "https://w3id.org/sol/v2.0"
  ],
  "controller": [],
  "verificationMethod": [
    {
      "id": "did:sol:devnet:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa#default",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:sol:devnet:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa",
      "publicKeyBase58": "ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa"
    }
  ],
  "authentication": [],
  "assertionMethod": [],
  "keyAgreement": [],
  "capabilityInvocation": [
    "#default"
  ],
  "capabilityDelegation": [],
  "service": [],
  "id": "did:sol:devnet:ygGfLvAyuRymPNv2fJDK1ZMpdy59m8cV5dak6A8uHKa"
}`,
  ];

  static flags = {};

  static args = [
    {
      name: 'didsol',
      description: 'did:sol DID to be resolved',
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Resolve);

    const didSolIdentifier = DidSolIdentifier.parse(args.didsol);

    const service = await DidSolService.build(didSolIdentifier);

    // console.log(`did:sol: ${service.did}`);
    // console.log(`did:sol PDA: ${service.didDataAccount.toBase58()}`);
    // console.log(`did:sol legacy PDA: ${service.legacyDidDataAccount.toBase58()}`);

    const doc = await service.resolve();
    this.log(JSON.stringify(doc, null, 2));
  }
}
