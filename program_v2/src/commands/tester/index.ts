import { Command, Flags } from '@oclif/core';

export default class Tester extends Command {
  static description = '';

  static examples = [
    `$ oex tester firsttest --version 1.0.0
firsttest v1.0.0! (./src/commands/tester/index.ts)
`,
  ];

  static flags = {
    version: Flags.string({
      char: 'v',
      description: 'test version',
      required: true,
    }),
  };

  static args = [
    { name: 'testName', description: 'The name of the test', required: true },
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Tester);

    this.log(
      `${args.testName} v${flags.version}! (./src/commands/tester/index.ts)`
    );
  }
}
