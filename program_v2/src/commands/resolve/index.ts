// import { resolve } from '@identity.com/sol-did-client';
import { Command } from '@oclif/core';
import { DidSolIdentifier } from '../../DidSolIdentifier';
import { DidSolService } from '../../DidSolService';

export default class Resolve extends Command {
  static description = 'Resolves a DID';

  static examples = [
    `$ oex resolve [did]
resolved... (./src/commands/resolve/index.ts)
`,
  ];

  static flags = {};

  static args = [
    { name: 'didsol', description: 'DID to be resolved', required: true },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Resolve);

    const didSol = new DidSolIdentifier(args.didsol);
    didSol.clusterType = 'localnet';
    const service = await DidSolService.build(didSol);

    const DID = await service.resolve(args.didsol);

    // service.resolve(args.didsol);
    this.log(`resolved... ${DID.id}`);
  }
}

// did:sol:localnet:3LqWFGc8KTCigN12n8utPT8ZuRAtDgvtG3v8SFmRuMP6
