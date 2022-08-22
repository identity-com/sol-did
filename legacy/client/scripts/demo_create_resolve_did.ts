import { ClusterType, register, resolve, SolanaUtil } from '../src';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getPDAKeyFromAuthority } from '../src/lib/solana/sol-data';

const main = async () => {
  const connection = new Connection('http://localhost:8899', 'recent');
  const payer = await SolanaUtil.newAccountWithLamports(
    connection,
    LAMPORTS_PER_SOL
  );
  const owner = Keypair.generate().publicKey;
  console.log('owner: ', owner.toBase58());
  console.log("retrieving owner's did...");
  const document = await resolve('did:sol:localnet:' + owner);
  console.log('generative document: ', document);

  console.log(
    'document will be registered at ' + (await getPDAKeyFromAuthority(owner))
  );
  console.log('registering document...');
  const identifier = await register({
    payer: payer.secretKey,
    owner: owner.toBase58(),
    cluster: ClusterType.development(),
    document: {
      authentication: ['did:sol:localnet:' + owner.toBase58()],
    },
  });

  console.log('Identifier: ', identifier);

  console.log('resolving new document...');
  const newDocument = await resolve(identifier.toString());

  console.log('new document: ', newDocument);
};

main()
  .then()
  .catch((err) => {
    throw err;
  });
