import { Account } from '@solana/web3.js';
import { ClusterType, SolidPublicKey, SolidData } from '../src/solid-data';
import { SolidInstruction } from '../src/instruction';
import { BN } from 'bn.js';
import { strict as assert } from 'assert';

describe('(de)serialize operations', () => {
  it('works for SolidData', () => {
    const authority = new Account();
    const solidAccount = new Account();
    const solid = SolidData.sparse(
      solidAccount.publicKey,
      authority.publicKey,
      ClusterType.development()
    );
    testSerialization(SolidData, solid);
  });

  it('works for PublicKey', () => {
    const keypair = new Account();
    const publicKey = keypair.publicKey;
    const solanaBuffer = publicKey.toBuffer();
    const recordKey = SolidPublicKey.fromPublicKey(publicKey);
    const recordKeyBuffer = recordKey.encode();
    assert.deepEqual(solanaBuffer, recordKeyBuffer);
    assert.deepEqual(publicKey, recordKey.toPublicKey());
  });

  it('works for SolidInstruction.initialize', () => {
    const instruction = SolidInstruction.initialize(ClusterType.mainnetBeta());
    testSerialization(SolidInstruction, instruction);
  });

  it('works for SolidInstruction.write', () => {
    const offset = new BN('ffffffffffffffff', 16);
    const data = new Uint8Array([2, 4, 1, 2, 4]);
    const instruction = SolidInstruction.write(offset, data);
    testSerialization(SolidInstruction, instruction);
  });

  it('works for SolidInstruction.closeAccount', () => {
    const instruction = SolidInstruction.closeAccount();
    testSerialization(SolidInstruction, instruction);
  });
});

function testSerialization(type: any, obj: any) {
  const serialized = obj.encode();
  const deserialized = type.decode(serialized);
  const reserialized = deserialized.encode();
  assert.deepEqual(serialized, reserialized);
}
