import { server } from '../src';

describe('The resolver app', () => {
  it('starts', done => {
    server.once('listening', () => {
      server.close(() => {
        // jest needs some time after the service stops. Skipping the delay leads to an error
        setTimeout(() => done(), 100);
      });
    });
  });
});
