import * as anchor from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { before } from "mocha";
import { DidSolService } from "../../src";
import { findProgramAddress } from "../../src/lib/utils";

import { getGeneratedDidDocument, didDocComplete } from "../fixtures/did-documents";


chai.use(chaiAsPromised);

describe("sol-did resolve operations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const authority = programProvider.wallet;
  let service: DidSolService;

  before(async () => {
    const [didData, _] = await findProgramAddress(authority.publicKey);
    service = new DidSolService(program, authority.publicKey, didData, programProvider);
  })

  it("can successfully resolve a generative DID", async () => {
    const solKey = web3.Keypair.generate();
    const [solKeyData, _] = await findProgramAddress(solKey.publicKey);
    const localService = new DidSolService(program, solKey.publicKey, solKeyData, programProvider);

    const didDoc = await localService.resolve();
    // TODO: Check reverse RPC lookup.
    expect(didDoc).to.deep.equal(getGeneratedDidDocument(solKey.publicKey.toBase58(),'did:sol:localnet:'));
  })

  it("can successfully resolve a DID", async () => {
    const didDoc = await service.resolve();
    expect(didDoc).to.deep.equal(didDocComplete);
  })
});
