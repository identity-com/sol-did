import { Enum, Assignable, SCHEMA } from './solana-borsh';
import { SolData } from './sol-data';
import { PROGRAM_ID } from '../constants';
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';

export class Initialize extends Assignable {
  size: number;
  initData: SolData;
}

export class Write extends Assignable {
  offset: number;
  data: Uint8Array;
}

export class CloseAccount extends Assignable {}

export class SolInstruction extends Enum {
  initialize: Initialize;
  write: Write;
  closeAccount: CloseAccount;

  static initialize(size: number, initData: SolData): SolInstruction {
    return new SolInstruction({
      initialize: new Initialize({ size, initData }),
    });
  }

  static write(offset: number, data: Uint8Array): SolInstruction {
    return new SolInstruction({ write: new Write({ offset, data }) });
  }

  static closeAccount(): SolInstruction {
    return new SolInstruction({ closeAccount: new CloseAccount({}) });
  }
}

export function initialize(
  payer: PublicKey,
  solKey: PublicKey,
  authority: PublicKey,
  size: number,
  initData: SolData
): TransactionInstruction {
  const keys: AccountMeta[] = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: solKey, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  const initDataWithAuthorityAndKey = initData.forAuthority(authority);
  const data = SolInstruction.initialize(
    size,
    initDataWithAuthorityAndKey
  ).encode();
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

export function write(
  solAccount: PublicKey,
  authority: PublicKey,
  offset: number,
  solData: Uint8Array
): TransactionInstruction {
  const keys: AccountMeta[] = [
    { pubkey: solAccount, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
  ];
  const data = SolInstruction.write(offset, solData).encode();
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

export function closeAccount(
  solAccount: PublicKey,
  authority: PublicKey,
  receiver: PublicKey
): TransactionInstruction {
  const keys: AccountMeta[] = [
    // the DID account
    { pubkey: solAccount, isSigner: false, isWritable: true },
    // a key with close permissions on the DID
    { pubkey: authority, isSigner: true, isWritable: false },
    // the account to receive the lamports
    { pubkey: receiver, isSigner: false, isWritable: false },
  ];
  const data = SolInstruction.closeAccount().encode();
  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

SCHEMA.set(SolInstruction, {
  kind: 'enum',
  field: 'enum',
  values: [
    ['initialize', Initialize],
    ['write', Write],
    ['closeAccount', CloseAccount],
  ],
});
SCHEMA.set(Initialize, {
  kind: 'struct',
  fields: [
    ['size', 'u64'],
    ['initData', SolData],
  ],
});
SCHEMA.set(Write, {
  kind: 'struct',
  fields: [
    ['offset', 'u64'],
    ['data', ['u8']],
  ],
});
SCHEMA.set(CloseAccount, { kind: 'struct', fields: [] });
