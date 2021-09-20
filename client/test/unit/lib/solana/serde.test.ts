import { Keypair } from '@solana/web3.js';
import {
  ClusterType,
  SolPublicKey,
  SolData,
} from '../../../../src/lib/solana/sol-data';
import { Assignable, SCHEMA } from '../../../../src/lib/solana/solana-borsh';
import {
  Initialize,
  SolInstruction,
} from '../../../../src/lib/solana/instruction';
import { strict as assert } from 'assert';

describe('(de)serialize operations', () => {
  it('works for SolData', async () => {
    const authority = Keypair.generate();
    const solAccount = Keypair.generate();
    const sol = SolData.sparse(
      solAccount.publicKey,
      authority.publicKey,
      ClusterType.development()
    );
    testSerialization<SolData>(sol);
  });

  it('works for PublicKey', () => {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey;
    const solanaBuffer = publicKey.toBuffer();
    const recordKey = SolPublicKey.fromPublicKey(publicKey);
    const recordKeyBuffer = recordKey.encode();
    assert.deepEqual(solanaBuffer, recordKeyBuffer);
    assert.deepEqual(publicKey, recordKey.toPublicKey());
  });

  it('works for SolInstruction.initialize', async () => {
    const authority = Keypair.generate();
    const solAccount = Keypair.generate();
    const solData = SolData.sparse(
      solAccount.publicKey,
      authority.publicKey,
      ClusterType.mainnetBeta()
    );
    const instruction = SolInstruction.initialize(100, solData);
    console.log('Instruction schema', SCHEMA.get(Initialize)); // Why is the data field undefined?!?!?!
    console.log('sol data', SolData); // It's not undefined here!!!!
    testSerialization<SolInstruction>(instruction);
  });

  it('works for SolInstruction.write', () => {
    const offset = 1_000_000;
    const data = new Uint8Array([2, 4, 1, 2, 4]);
    const instruction = SolInstruction.write(offset, data);
    testSerialization<SolInstruction>(instruction);
  });

  it('works for SolInstruction.closeAccount', () => {
    const instruction = SolInstruction.closeAccount();
    testSerialization<SolInstruction>(instruction);
  });
});

function testSerialization<T extends Assignable>(obj: T) {
  const serialized = obj.encode();
  const deserialized: T = (<typeof Assignable>obj.constructor).decode(
    serialized
  );
  const reserialized = deserialized.encode();
  assert.deepEqual(serialized, reserialized);
}
