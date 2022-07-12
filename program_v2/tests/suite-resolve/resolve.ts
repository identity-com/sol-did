import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../../target/types/sol_did";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";

import { findProgramAddress, VerificationMethodFlags } from "../utils/utils";
import { before } from "mocha";
import { DidSolService } from "../../src";


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

  it("can successfully resolve a DID", async () => {
      const didDoc = await service.resolve();
      // TODO.
      expect(didDoc).to.be.an("object");
  })
});
