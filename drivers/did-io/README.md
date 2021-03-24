# DID.io SOLID Driver

A SOLID driver for the [did.io](https://github.com/digitalbazaar/did-io) DID client.

## Usage

The SOLID driver supports the `register()` and `get()` functions only, and generates
'sparse' DID documents, i.e. those derived from an initial private key with no additional
properties.

To generate a DID:

```js
import didIo from 'did-io';
import didSolid from 'did-io-driver-solid'
didIo.use('solid', didSolid.driver({payer: PAYER_KEY}))

const did = await didIo.register({
  key: OWNER_KEY, 
  didDocument: { did: 'did:solid:'},
  cluster: 'devnet'   // omit for mainnet
})
```

where PAYER_KEY is the private key of the transaction payer on solana
and OWNER_KEY is the public key of the owner of the DID,
both encrypted as base58 strings.
