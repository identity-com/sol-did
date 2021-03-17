import { Enum, Assignable, SCHEMA } from './solana-borsh';
import { SolidData } from './solid-data';
import { DID_METHOD, PROGRAM_ID } from '../constants';
import {
  AccountMeta,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';

export class Initialize extends Assignable {
  size: number;
  initData: SolidData;
}

export class Write extends Assignable {
  offset: number;
  data: Uint8Array;
}

export class CloseAccount extends Assignable {}

export class SolidInstruction extends Enum {
  initialize: Initialize;
  write: Write;
  closeAccount: CloseAccount;

  static initialize(
    size: number,
    initData: SolidData
  ): SolidInstruction {
    return new SolidInstruction({
      initialize: new Initialize({ size, initData }),
    });
  }

  static write(offset: number, data: Uint8Array): SolidInstruction {
    return new SolidInstruction({ write: new Write({ offset, data }) });
  }

  static closeAccount(): SolidInstruction {
    return new SolidInstruction({ closeAccount: new CloseAccount({}) });
  }
}

export async function getKeyFromAuthority(
  authority: PublicKey
): Promise<PublicKey> {
  const publicKeyNonce = await PublicKey.findProgramAddress(
    [authority.toBuffer(), Buffer.from(DID_METHOD, 'utf8')],
    PROGRAM_ID
  );
  return publicKeyNonce[0];
}

export function initialize(
  payer: PublicKey,
  solidKey: PublicKey,
  authority: PublicKey,
  size: number,
  initData: SolidData
): TransactionInstruction {
  const keys: AccountMeta[] = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: solidKey, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  const initDataWithAuthorityAndKey = initData.forAuthority(authority);
  const data = SolidInstruction.initialize(
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
  solidAccount: PublicKey,
  authority: PublicKey,
  offset: number,
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

export function closeAccount(
  solidAccount: PublicKey,
  authority: PublicKey,
  receiver: PublicKey
): TransactionInstruction {
  const keys: AccountMeta[] = [
    // the DID account
    { pubkey: solidAccount, isSigner: false, isWritable: true },
    // a key with close permissions on the DID
    { pubkey: authority, isSigner: true, isWritable: false },
    // the account to receive the lamports
    { pubkey: receiver, isSigner: false, isWritable: false },
  ];
  const data = SolidInstruction.closeAccount().encode();
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
    ['closeAccount', CloseAccount],
  ],
});
SCHEMA.set(Initialize, {
  kind: 'struct',
  fields: [['size', 'u64'],
    ['initData', SolidData]],
});
SCHEMA.set(Write, {
  kind: 'struct',
  fields: [
    ['offset', 'u64'],
    ['data', ['u8']],
  ],
});
SCHEMA.set(CloseAccount, { kind: 'struct', fields: [] });
