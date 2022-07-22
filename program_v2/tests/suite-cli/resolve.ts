import { expect, test } from '@oclif/test';
import { Keypair } from '@solana/web3.js';
import { getGeneratedDidDocument } from '../fixtures/loader';
describe('resolve', () => {
  const randomPublicKey = Keypair.generate().publicKey;
  test
    .stdout()
    .command(['resolve', `did:sol:localnet:${randomPublicKey.toBase58()}`])
    .it('runs resolver cmd', (ctx) => {
      expect(ctx.stdout).to.contain('resolved...');
    });
  // test.stdout().command(['resolve', '']).it('')
});

//test to devnet in generative case

//did:sol:devnet:JCU5Xzri4N88UdS3WHQZZ9fgTVpiSxTiKiSZKbfJh7Sx
