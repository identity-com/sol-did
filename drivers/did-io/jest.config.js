module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!@digitalbazaar/(did-io|lru-memoize))'],
  moduleNameMapper: {
    '@digitalbazaar/did-io': '@digitalbazaar/did-io/lib/main.js',
    '@digitalbazaar/lru-memoize': '@digitalbazaar/lru-memoize/lib/main.js',
  }
};
