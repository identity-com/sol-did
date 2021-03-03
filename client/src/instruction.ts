import { Enum, Assignable, SCHEMA } from './solana-borsh';
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';

export const PROGRAM_ID: PublicKey = new PublicKey(
  'ide3Y2TubNMLLhiG1kDL6to4a8SjxD18YWCYC5BZqNV'
);

export class Initialize extends Assignable {}

export class Write extends Assignable {
  offset: BN;
  data: Uint8Array;
}

export class SetAuthority extends Assignable {}

export class CloseAccount extends Assignable {}

export class SolidInstruction extends Enum {
  initialize: Initialize;
  write: Write;
  setAuthority: SetAuthority;
  closeAccount: CloseAccount;

  static initialize(): SolidInstruction {
    return new SolidInstruction({ initialize: new Initialize({}) });
  }

  static write(offset: BN, data: Uint8Array): SolidInstruction {
    return new SolidInstruction({ write: new Write({ offset, data }) });
  }

  static setAuthority(): SolidInstruction {
    return new SolidInstruction({ setAuthority: new SetAuthority({}) });
  }

  static closeAccount(): SolidInstruction {
    return new SolidInstruction({ closeAccount: new CloseAccount({}) });
  }
}

export function initialize(
  solidAccount: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  const keys: AccountMeta[] = [
    { pubkey: solidAccount, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
  ];
  const data = SolidInstruction.initialize().encode();
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

export function write(
  solidAccount: PublicKey,
  authority: PublicKey,
  offset: BN,
  solidData: Uint8Array
): TransactionInstruction {
  const keys: AccountMeta[] = [
    { pubkey: solidAccount, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
  ];
  const data = SolidInstruction.write(offset, solidData).encode();
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

SCHEMA.set(SolidInstruction, {
  kind: 'enum',
  field: 'enum',
  values: [
    ['initialize', Initialize],
    ['write', Write],
    ['setAuthority', SetAuthority],
    ['closeAccount', CloseAccount],
  ],
});
SCHEMA.set(Initialize, { kind: 'struct', fields: [] });
SCHEMA.set(Write, {
  kind: 'struct',
  fields: [
    ['offset', 'u64'],
    ['data', ['u8']],
  ],
});
SCHEMA.set(SetAuthority, { kind: 'struct', fields: [] });
SCHEMA.set(CloseAccount, { kind: 'struct', fields: [] });
