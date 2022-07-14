import { SolDid } from "../target/types/sol_did";
import { AnchorProvider, Program, web3 } from "@project-serum/anchor";
import {
  EthSigner,
  ethSignPayload,
  fetchProgram,
  findProgramAddress, INITIAL_DEFAULT_ACCOUNT_SIZE, INITIAL_MIN_ACCOUNT_SIZE,
} from "./lib/utils";
import { DIDDocument } from "did-resolver";

export class DidSolService {
  private program: Program<SolDid>;

  static async build(
    provider: AnchorProvider,
    didIdentifier: web3.PublicKey
  ): Promise<DidSolService> {
    const program = await fetchProgram(provider);
    const [didDataAccount, _] = await findProgramAddress(didIdentifier);

    return new DidSolService(program, didIdentifier, didDataAccount, provider);
  }

  constructor(
    program: Program<SolDid>,
    private didIdentifier: web3.PublicKey,
    private didDataAccount: web3.PublicKey,
    private provider: AnchorProvider
  ) {
    this.program = new Program<SolDid>(
      program.idl,
      program.programId,
      provider,
      program.coder
    );
  }


  /**
   * Signs a supported DidSol Instruction with an Ethereum Signer. Every Instruction apart from "initialize" is supported
   * @param instruction The DidSol Instruction to sign
   * @param signer The Ethereum Signer
   */
  async ethSignInstruction(instruction: web3.TransactionInstruction, signer: EthSigner): Promise<web3.TransactionInstruction> {
    const nonce = await this.program.account.didAccount
      .fetch(this.didDataAccount)
      .then((account) => account.nonce);
    return ethSignPayload(instruction, nonce, signer);
  }

  /**
   * Initializes the did:sol account.
   * Does **not** support ethSignInstruction
   * @param size
   */
  async initialize(size: number | null = INITIAL_DEFAULT_ACCOUNT_SIZE): Promise<web3.TransactionInstruction> {
    if (size && size < INITIAL_MIN_ACCOUNT_SIZE) {
      throw new Error(`Account size must be at least ${INITIAL_MIN_ACCOUNT_SIZE}`);
    }

    return this.program.methods
      .initialize(size)
      .accounts({
        didData: this.didDataAccount,
        authority: this.didIdentifier
      })
      .instruction();
  }

  /**
   * Resize the did:sol account.
   * Supports ethSignInstruction
   * @param size The new size of the account
   * @param payer The account to pay the rent-exempt fee with.
   * @param authority The Solana Authority to use. Can be "wrong" if instruction is later signed with ethSigner
   */
  async resize(size: number, payer: web3.PublicKey, authority: web3.PublicKey): Promise<web3.TransactionInstruction> {
    return this.program.methods
      .resize(size, null)
      .accounts({
        didData: this.didDataAccount,
        payer,
        authority,
      })
      .instruction();
  }

  /**
   * Close the did:sol account.
   * Supports ethSignInstruction
   * @param authority The Solana Authority to use. Can be "wrong" if instruction is later signed with ethSigner
   * @param destination The destination account to move the lamports to.
   */
  async close(authority: web3.PublicKey, destination: web3.PublicKey): Promise<web3.TransactionInstruction> {
    return this.program.methods
      .close(null)
      .accounts({
        didData: this.didDataAccount,
        authority,
        destination,
      })
      .instruction();
  }

  // TODO Implement
  async resolve(): Promise<DIDDocument> {
    const didDataAccount = await this.program.account.didAccount.fetch(
      this.didDataAccount
    );

    return {
      "@context": undefined,
      alsoKnownAs: [],
      assertionMethod: [],
      authentication: [],
      capabilityDelegation: [],
      capabilityInvocation: [],
      controller: undefined,
      id: "asdf",
      keyAgreement: [],
      publicKey: [],
      service: [],
      verificationMethod: [],
    };
  }
}
