import { expect, test } from '@oclif/test';
import { Keypair } from '@solana/web3.js';
import { getGeneratedDidDocument } from '../../fixtures/loader';
describe('resolve', () => {
  const randomLocalnetKey = Keypair.generate().publicKey.toBase58();
  const randomDevnetKey = Keypair.generate().publicKey.toBase58();
  test
    .stdout()
    .command(['resolve', `did:sol:localnet:${randomLocalnetKey}`])
    .it('resolves randomly-generated did', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal(
        getGeneratedDidDocument(randomLocalnetKey, 'did:sol:localnet:')
      );
    });
  test
    .stdout()
    .command([
      'resolve',
      'did:sol:localnet:F4z36iiKA1Ymp7suNTiTGpN9JH3C5sceSGBSzyPsfFJz',
    ])
    .it('resolves legacy did', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal(
        getGeneratedDidDocument(
          'F4z36iiKA1Ymp7suNTiTGpN9JH3C5sceSGBSzyPsfFJz',
          'did:sol:localnet:'
        )
      );
    });
  test
    .stdout()
    .command(['resolve', `did:sol:devnet:${randomDevnetKey}`])
    .it('resolves did on devnet', (ctx) => {
      expect(JSON.parse(ctx.stdout)).to.deep.equal(
        getGeneratedDidDocument(`${randomDevnetKey}`, 'did:sol:devnet:')
      );
    });
});

//did:sol:devnet:JCU5Xzri4N88UdS3WHQZZ9fgTVpiSxTiKiSZKbfJh7Sx
