import { resolve } from '@identity.com/sol-did-client';
import { Command } from '@oclif/core';

export default class Resolve extends Command {
  static description = 'Resolves a DID';

  static examples = [
    `$ oex resolve [did]
resolved... (./src/commands/resolve/index.ts)
`,
  ];

  static flags = {};

  static args = [
    { name: 'didSol', description: 'DID to be resolved', required: true },
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(Resolve);

    const DID = await resolve(args.didSol);
    this.log(`resolved... ${DID.id}`);
  }
}

// did:sol:localnet:3LqWFGc8KTCigN12n8utPT8ZuRAtDgvtG3v8SFmRuMP6
