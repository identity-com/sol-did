import { CustomClusterUrlConfig } from "@identity.com/sol-did-client";
import { readFile } from "fs/promises";

const CONFIG_FILE_LOCATION = './config/config.json';

type Config = {
  solanaRpcNodes: CustomClusterUrlConfig;
}

let configJson: Config | null = null;

export const getConfig = async (): Promise<Config | null> => {
  if (configJson) return configJson;

  console.log(`Trying to load a config from FS: ${CONFIG_FILE_LOCATION}`);
  try {
    const configFile = await readFile(CONFIG_FILE_LOCATION, 'utf8');
    configJson = JSON.parse(configFile);
    console.log(`Successfully loaded a config from FS: ${JSON.stringify(configJson)}`);
  } catch (e) {
    console.log('Failed to load a config from FS:', e);
    // no config file
  }

  return configJson;
}

