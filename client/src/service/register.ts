import {
  getPublicKey,
  makeKeypair,
  RegisterInstructionRequest,
  RegisterRequest,
} from '../lib/util';
import { SolTransaction } from '../lib/solana/transaction';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  ClusterType,
  DecentralizedIdentifier,
  getPDAKeyFromAuthority,
  SolData,
} from '../lib/solana/sol-data';
import { DEFAULT_DOCUMENT_SIZE, SOLANA_COMMITMENT } from '../lib/constants';

/**
 * Registers a SOL DID on Solana.
 * @param request
 */
export const register = async (request: RegisterRequest): Promise<string> => {
  const payer = makeKeypair(request.payer);
  const owner = request.owner
    ? new PublicKey(request.owner)
    : getPublicKey(request.payer);
  const cluster = request.cluster || ClusterType.mainnetBeta();
  const size = request.size || DEFAULT_DOCUMENT_SIZE;
  const connection =
    request.connection ||
    new Connection(cluster.solanaUrl(), SOLANA_COMMITMENT);
  await SolTransaction.createDID(
    connection,
    payer,
    owner,
    size,
    request.document
      ? await SolData.parse(request.document)
      : SolData.sparse(await getPDAKeyFromAuthority(owner), owner, cluster)
  );

  return DecentralizedIdentifier.create(owner, cluster).toString();
};

export const createRegisterInstruction = async ({
  payer,
  authority,
  size = DEFAULT_DOCUMENT_SIZE,
  document,
}: RegisterInstructionRequest): Promise<
  [TransactionInstruction, PublicKey]
> => {
  const initData = document
    ? await SolData.parse(document)
    : SolData.sparse(
        await getPDAKeyFromAuthority(authority),
        authority,
        ClusterType.mainnetBeta()
      );
  return SolTransaction.createDIDInstruction(payer, authority, size, initData);
};
