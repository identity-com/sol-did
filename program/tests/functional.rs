// Mark this test as BPF-only due to current `ProgramTest` limitations when CPIing into the system program
#![cfg(feature = "test-bpf")]

use solana_program_test::tokio;
use solana_sdk::account::Account;
use solana_sdk::program_error::ProgramError;
use {
    borsh::BorshSerialize,
    sol_did::{
        borsh as program_borsh,
        error::SolError,
        id, instruction,
        processor::process_instruction,
        state::{
            get_sol_address_with_seed, DecentralizedIdentifier, ServiceEndpoint, SolData,
            VerificationMethod,
        },
        validate_owner,
    },
    solana_program::{
        instruction::{AccountMeta, Instruction, InstructionError},
        pubkey::Pubkey,
        rent::Rent,
    },
    solana_program_test::{processor, ProgramTest, ProgramTestContext},
    solana_sdk::{
        account_info::IntoAccountInfo,
        signature::{Keypair, Signer},
        transaction::{Transaction, TransactionError},
        transport,
    },
};

fn program_test() -> ProgramTest {
    ProgramTest::new("sol_did", id(), processor!(process_instruction))
}

async fn initialize_did_account(
    context: &mut ProgramTestContext,
    authority: &Pubkey,
    size: usize,
) -> transport::Result<()> {
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            authority,
            size as u64,
            SolData::default(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(transaction).await
}

fn check_sol(data: SolData, authority: Pubkey) {
    let did = DecentralizedIdentifier::new(&data);
    let verification_method = VerificationMethod::new_default(authority);
    assert_eq!(data.version, SolData::DEFAULT_VERSION);
    assert_eq!(data.did(), did);
    assert_eq!(data.verification_method, vec![]);
    assert_eq!(
        data.inferred_verification_methods(),
        vec![verification_method.clone()]
    );
    assert_eq!(data.authentication, vec![] as Vec<String>);
    assert_eq!(data.capability_invocation, vec![] as Vec<String>);
    assert_eq!(
        data.inferred_capability_invocation(),
        vec![VerificationMethod::DEFAULT_KEY_ID.to_string()]
    );
    assert_eq!(data.capability_delegation, vec![] as Vec<String>);
    assert_eq!(data.key_agreement, vec![] as Vec<String>);
    assert_eq!(data.assertion_method, vec![] as Vec<String>);
    assert_eq!(data.service, vec![]);
}

#[tokio::test]
async fn initialize_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    let (sol, _) = get_sol_address_with_seed(&authority);
    initialize_did_account(&mut context, &authority, SolData::DEFAULT_SIZE)
        .await
        .unwrap();
    let account_info = context
        .banks_client
        .get_account(sol)
        .await
        .unwrap()
        .unwrap();
    let account_data =
        program_borsh::try_from_slice_incomplete::<SolData>(&account_info.data).unwrap();
    check_sol(account_data, authority);
}

#[tokio::test]
async fn initialize_with_service_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    let (sol, _) = get_sol_address_with_seed(&authority);
    let mut init_data = SolData::default();
    let endpoint = "http://localhost".to_string();
    let endpoint_type = "local".to_string();
    let description = "A localhost service".to_string();
    let service_endpoint = ServiceEndpoint {
        id: "service1".to_string(),
        endpoint_type,
        endpoint,
        description,
    };
    init_data.service = vec![service_endpoint.clone()];
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            &authority,
            SolData::DEFAULT_SIZE as u64,
            init_data,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();
    let account_info = context
        .banks_client
        .get_account(sol)
        .await
        .unwrap()
        .unwrap();
    let account_data =
        program_borsh::try_from_slice_incomplete::<SolData>(&account_info.data).unwrap();
    assert_eq!(account_data.service, vec![service_endpoint]);
}

#[tokio::test]
async fn initialize_twice_fail() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    initialize_did_account(&mut context, &authority, SolData::DEFAULT_SIZE)
        .await
        .unwrap();
    // doing what looks like the same transaction twice causes issues, so
    // move forward to ensure it looks different
    context.warp_to_slot(50).unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            &authority,
            1,
            SolData::default(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(0, InstructionError::AccountAlreadyInitialized)
    );
}

#[tokio::test]
async fn initialize_too_small_fail() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    let err = initialize_did_account(&mut context, &authority, 10)
        .await
        .unwrap_err()
        .unwrap();
    assert_eq!(
        err,
        TransactionError::InstructionError(0, InstructionError::InvalidError)
    );
}

#[tokio::test]
async fn write_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();

    let account_info = context
        .banks_client
        .get_account(sol)
        .await
        .unwrap()
        .unwrap();
    let mut sol_data =
        program_borsh::try_from_slice_incomplete::<SolData>(&account_info.data).unwrap();
    let test_endpoint = ServiceEndpoint {
        id: "service1".to_string(),
        endpoint_type: "example".to_string(),
        endpoint: "example.com".to_string(),
        description: "".to_string(),
    };
    sol_data.service.push(test_endpoint.clone());
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &sol,
            &authority.pubkey(),
            0,
            sol_data.try_to_vec().unwrap(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &authority],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let account_info = context
        .banks_client
        .get_account(sol)
        .await
        .unwrap()
        .unwrap();
    let new_sol_data =
        program_borsh::try_from_slice_incomplete::<SolData>(&account_info.data).unwrap();
    assert_eq!(new_sol_data, sol_data);
}

#[tokio::test]
async fn write_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();

    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    let new_data = SolData::new_sparse(authority.pubkey());
    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &sol,
            &wrong_authority.pubkey(),
            0,
            new_data.try_to_vec().unwrap(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &wrong_authority],
        context.last_blockhash,
    );
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(
            0,
            InstructionError::Custom(SolError::IncorrectAuthority as u32)
        )
    );
}

#[tokio::test]
async fn write_fail_overridden_authority() {
    let mut context = program_test().start_with_context().await;

    // create a DID with an authority, but immediately add a new authority to the verification methods
    // so the original authority is no longer able to use it
    let original_authority = Keypair::new();
    let new_authority = Keypair::new();
    let mut init_data = SolData::default();
    let new_authority_method = VerificationMethod::new(new_authority.pubkey(), "key1".to_string());
    init_data.verification_method = vec![new_authority_method];
    init_data.capability_invocation = vec!["key1".to_string()];

    let create_transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            &original_authority.pubkey(),
            SolData::DEFAULT_SIZE as u64,
            init_data,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(create_transaction)
        .await
        .unwrap();

    let (sol, _) = get_sol_address_with_seed(&original_authority.pubkey());
    let new_data = SolData::new_sparse(original_authority.pubkey());

    // attempt to make a change as the original authority
    let transaction_with_original_authority = Transaction::new_signed_with_payer(
        &[instruction::write(
            &sol,
            &original_authority.pubkey(),
            0,
            new_data.try_to_vec().unwrap(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &original_authority],
        context.last_blockhash,
    );

    // the transaction should fail because
    // the original authority is no longer authorized to make changes
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction_with_original_authority)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(
            0,
            InstructionError::Custom(SolError::IncorrectAuthority as u32)
        )
    );
}

#[tokio::test]
async fn write_fail_unsigned() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();

    let new_data = SolData::new_sparse(authority.pubkey());
    let data = new_data.try_to_vec().unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolInstruction::Write { offset: 0, data },
            vec![
                AccountMeta::new(sol, false),
                AccountMeta::new_readonly(authority.pubkey(), false),
            ],
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(0, InstructionError::MissingRequiredSignature)
    );
}

#[tokio::test]
async fn close_account_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();
    let recipient = Pubkey::new_unique();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction::close_account(
            &sol,
            &authority.pubkey(),
            &recipient,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &authority],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let account = context
        .banks_client
        .get_account(recipient)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(
        account.lamports,
        1.max(Rent::default().minimum_balance(SolData::DEFAULT_SIZE))
    );
}

#[tokio::test]
async fn close_account_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();
    let recipient = Pubkey::new_unique();

    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::close_account(
            &sol,
            &wrong_authority.pubkey(),
            &recipient,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &wrong_authority],
        context.last_blockhash,
    );
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(
            0,
            InstructionError::Custom(SolError::IncorrectAuthority as u32)
        )
    );
}

#[tokio::test]
async fn close_account_fail_unsigned() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (sol, _) = get_sol_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey(), SolData::DEFAULT_SIZE)
        .await
        .unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolInstruction::CloseAccount,
            vec![
                AccountMeta::new(sol, false),
                AccountMeta::new_readonly(authority.pubkey(), false),
                AccountMeta::new(Pubkey::new_unique(), false),
            ],
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    assert_eq!(
        context
            .banks_client
            .process_transaction(transaction)
            .await
            .unwrap_err()
            .unwrap(),
        TransactionError::InstructionError(0, InstructionError::MissingRequiredSignature)
    );
}

#[tokio::test]
async fn validate_owner_success() {
    let authority = Keypair::new();

    let (sol_pubkey, mut sol_account) = create_sol_account(authority.pubkey()).await;
    let sol_account_info = (&sol_pubkey, false, &mut sol_account).into_account_info();

    let mut empty_account = Account::new(0, 0, &authority.pubkey());
    let authority_key = &authority.pubkey();
    let authority_account_info = (authority_key, true, &mut empty_account).into_account_info();

    let validation_result = validate_owner(&sol_account_info, &[authority_account_info]);
    assert_eq!(validation_result, Ok(()));
}

#[tokio::test]
async fn validate_owner_failed_non_signer() {
    let authority = Keypair::new();
    let (sol_pubkey, mut sol_account) = create_sol_account(authority.pubkey()).await;
    let sol_account_info = (&sol_pubkey, false, &mut sol_account).into_account_info();

    let mut empty_account = Account::new(0, 0, &authority.pubkey());
    let authority_key = &authority.pubkey();
    // pass the authority, but not as a signer
    let authority_account_info = (authority_key, false, &mut empty_account).into_account_info();

    let validation_result = validate_owner(&sol_account_info, &[authority_account_info]);
    assert_eq!(validation_result, Err(ProgramError::Custom(0))) // IncorrectAuthority
}

#[tokio::test]
async fn validate_owner_failed_not_did() {
    // Tests the case where the DID account information is not owned by the Sol program
    // Checks against a spoofed DID
    let authority = Keypair::new();

    let (sol_pubkey, mut sol_account) = create_sol_account(authority.pubkey()).await;
    // change the account owner to something other than the DID program
    sol_account.owner = Pubkey::new_unique();
    let sol_account_info = (&sol_pubkey, false, &mut sol_account).into_account_info();

    let mut empty_account = Account::new(0, 0, &authority.pubkey());
    let authority_key = &authority.pubkey();
    let authority_account_info = (authority_key, true, &mut empty_account).into_account_info();

    let validation_result = validate_owner(&sol_account_info, &[authority_account_info]);
    assert_eq!(validation_result, Err(ProgramError::IncorrectProgramId))
}

async fn create_sol_account(authority_pubkey: Pubkey) -> (Pubkey, Account) {
    let mut context = program_test().start_with_context().await;
    initialize_did_account(&mut context, &authority_pubkey, SolData::DEFAULT_SIZE)
        .await
        .unwrap();

    let (sol, _) = get_sol_address_with_seed(&authority_pubkey);
    let sol_account = context
        .banks_client
        .get_account(sol)
        .await
        .unwrap()
        .unwrap();

    (sol, sol_account)
}
