import { expect, test } from '@oclif/test';
import { Keypair } from '@solana/web3.js';
import { getGeneratedDidDocument } from '../fixtures/loader';
describe('resolve', () => {
  const randomPublicKey = Keypair.generate().publicKey.toBase58();
  test
    .stdout({ print: true })
    .command(['sol resolve', `did:sol:localnet:${randomPublicKey}`])
    .it('runs resolver cmd', (ctx) => {
      console.debug(ctx.stdout);
      expect(ctx.stdout).to.deep.equal(
        getGeneratedDidDocument(randomPublicKey, 'localnet')
      );
    });
  // test.stdout().command(['resolve', '']).it('')
});

//test to devnet in generative case

//did:sol:devnet:JCU5Xzri4N88UdS3WHQZZ9fgTVpiSxTiKiSZKbfJh7Sx
