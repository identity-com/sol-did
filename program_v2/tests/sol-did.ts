import * as anchor from "@project-serum/anchor";
import { AccountClient, Program } from "@project-serum/anchor";
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
    const gameKeypair = anchor.web3.Keypair.generate();
    const playerOne = (program.provider as anchor.AnchorProvider).wallet;
    const tx = await program.methods.addService({
      id: "test",
      serviceType: "serviceType",
      serviceEndpoint: "test"
    }).accounts({
      data: gameKeypair.publicKey,
      playerOne: playerOne.publicKey,
    }).signers([gameKeypair]).rpc()
    const data = program.account.didAccountData.fetch(gameKeypair.publicKey);
    console.log(data)
  });
});
