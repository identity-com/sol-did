import { resolve } from '../src';

describe('resolve', () => {
  // Skip until we add a real DID on chain to point to
  it.skip('works', () => {
    return expect(resolve('did:solid:todo')).resolves.toMatchObject({
      id: 'todo',
    });
  });
});
