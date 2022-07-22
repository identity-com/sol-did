import { Command } from '@oclif/core';

export default class One extends Command {
  static description = 'Say tester one';

  static examples = [
    `$ oex tester one
tester one! (./src/commands/tester/one.ts)
`,
  ];

  static flags = {};

  static args = [];

  async run(): Promise<void> {
    this.log('tester one! (./src/commands/tester/one.ts)');
  }
}
