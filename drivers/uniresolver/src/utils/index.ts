import { getConfig } from "../config/config";
import {
  CustomClusterUrlConfig,
  DidSolIdentifier, DidSolService,
  getConnectionByCluster,
  SOLANA_COMMITMENT
} from "@identity.com/sol-did-client";

export * from './writer';

export const buildService =  async (identifier: string): Promise<DidSolService> => {
  const config = await getConfig();
  let clusterConfig: CustomClusterUrlConfig | undefined;
  if (config) {
    clusterConfig = config.solanaRpcNodes;
  }

  const didSolIdentifier = DidSolIdentifier.parse(identifier);

  // get connection from config
  const connection = getConnectionByCluster(didSolIdentifier.clusterType, SOLANA_COMMITMENT, clusterConfig);

  return DidSolService.build(didSolIdentifier, {
    connection,
  });
}
