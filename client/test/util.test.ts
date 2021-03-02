import { extractMethodIdentifierFromDID } from '../src/util';

describe('util', () => {
  describe('extractMethodIdentifierFromDID', () => {
    it('should extract the method identifier from a DID', function() {
      expect(extractMethodIdentifierFromDID('did:solid:abc')).toEqual('abc');
    });
  });
});
