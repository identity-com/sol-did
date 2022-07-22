import { expect, test } from '@oclif/test';

describe('resolve', () => {
  test
    .stdout()
    .command([
      'resolve',
      'did:sol:localnet:3LqWFGc8KTCigN12n8utPT8ZuRAtDgvtG3v8SFmRuMP6',
    ])
    .it('runs resolver cmd', (ctx) => {
      expect(ctx.stdout).to.contain('resolved...');
    });
});
