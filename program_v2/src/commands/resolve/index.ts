import { Command } from '@oclif/core';
import { DidSolIdentifier } from '../../DidSolIdentifier';
import { DidSolService } from '../../DidSolService';

export default class Resolve extends Command {
  static description = 'Resolves a DID';

  static examples = [
    `$ sol [did]
resolved... (./src/commands/resolve/index.ts)
`,
  ];

  static flags = {};

  static args = [
    { name: 'didsol', description: 'DID to be resolved', required: true },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Resolve);

    const didSol = DidSolIdentifier.parse(args.didsol);

    const service = await DidSolService.build(didSol);

    const doc = await service.resolve(args.didsol);
    this.log(JSON.stringify(doc, null, 2));
  }
}

// Example.
// did:sol:localnet:3LqWFGc8KTCigN12n8utPT8ZuRAtDgvtG3v8SFmRuMP6
