import { resolve } from '../src';

describe('resolve', () => {
  it('works', () => {
    //TODO
    return expect(resolve('todo')).resolves.toMatchObject({ id: 'todo' });
  });
});
