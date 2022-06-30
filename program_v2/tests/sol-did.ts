import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolDid } from "../target/types/sol_did";

describe("sol-did", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolDid as Program<SolDid>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
  it("Service added!", async () => {
    // Add your test here.
    const tx = await program.methods.addService({
      id: "test",
      serviceType: "serviceType",
      serviceEndpoint: "test",
    }).rpc();
    console.log("Your transaction signature", tx);
  });
});
