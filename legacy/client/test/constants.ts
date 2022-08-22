import { ClusterType } from '../src';

export const CLUSTER = ClusterType.parse(process.env.CLUSTER || 'localnet');
export const VALIDATOR_URL = CLUSTER.solanaUrl();

export const TEST_DID_ACCOUNT_SECRET_KEY = [
  187, 253, 113, 104, 36, 7, 18, 101, 43, 109, 116, 92, 47, 221, 244, 198, 101,
  212, 158, 142, 9, 235, 15, 111, 152, 66, 105, 124, 1, 131, 226, 125, 37, 118,
  207, 98, 14, 31, 0, 78, 57, 69, 96, 9, 131, 141, 108, 41, 32, 132, 91, 19, 47,
  154, 13, 19, 113, 203, 9, 52, 137, 139, 27, 108,
];
export const TEST_DID_ACCOUNT_PUBLIC_KEY =
  '3XFALpKxPF1CCfmaUE9vk1nAv6Peuzsv9quEFwhtpPdd';
