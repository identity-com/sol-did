const packagesToTransform = [
  '@digitalbazaar/did-io',
  '@digitalbazaar/lru-memoize',
  '@digitalbazaar/ed25519-verification-key-2018',
  '@digitalbazaar/did-io',
  'base58-universal',
].join('|')

module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [`/node_modules/(?!(${packagesToTransform}))`],
  moduleNameMapper: {
    '@digitalbazaar/did-io': '@digitalbazaar/did-io/lib/main.js',
    '@digitalbazaar/lru-memoize': '@digitalbazaar/lru-memoize/lib/main.js',
    '@digitalbazaar/ed25519-verification-key-2018': '@digitalbazaar/ed25519-verification-key-2018/src/main.js',
    '@digitalbazaar/did-io': '@digitalbazaar/did-io/lib/main.js',
    'base58-universal': 'base58-universal/main.js',
  }
};
