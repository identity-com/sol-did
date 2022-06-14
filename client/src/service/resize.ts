import { getPublicKey, makeKeypair, ResizeRequest } from '../lib/util';
import { SolTransaction } from '../lib/solana/transaction';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  ClusterType,
  DecentralizedIdentifier,
  getPDAKeyFromAuthority,
  SolData,
} from '../lib/solana/sol-data';
import { DEFAULT_DOCUMENT_SIZE, SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Resize a SOL DID Account on Solana.
 * @param request
 */
export const resize = async (resize: ResizeRequest): Promise<string> => {
  const id = DecentralizedIdentifier.parse(resize.did);

  const payer = makeKeypair(resize.payer);
  const owner = resize.owner
    ? new PublicKey(resize.owner)
    : getPublicKey(resize.payer);
  const cluster = resize.cluster || ClusterType.mainnetBeta();
  const size = resize.size || DEFAULT_DOCUMENT_SIZE;
  const connection =
    resize.connection || new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  await SolTransaction.resizeAccount(
    connection,
    payer,
    await id.pdaSolanaPubkey(),
    owner,
    size,
    resize.document
      ? await SolData.parse(resize.document)
      : SolData.sparse(await getPDAKeyFromAuthority(owner), owner, cluster)
  );

  return DecentralizedIdentifier.create(owner, cluster).toString();
};
