import { Command } from '@oclif/core';
import { DidSolIdentifier } from '../../DidSolIdentifier';
import { DidSolService } from '../../DidSolService';

export default class Sol extends Command {
  static description = 'Resolves a DID';

  static examples = [
    `$ sol 
resolved... (./src/commands/resolve/index.ts)
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    this.log(
      "welcome to the sol-did service... to resolve a did use the following command:'sol resolve [did]'"
    );
  }
}

// Example.
// did:sol:localnet:3LqWFGc8KTCigN12n8utPT8ZuRAtDgvtG3v8SFmRuMP6
