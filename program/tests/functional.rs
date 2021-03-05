// Mark this test as BPF-only due to current `ProgramTest` limitations when CPIing into the system program
#![cfg(feature = "test-bpf")]

use {
    borsh::BorshSerialize,
    solana_program::{
        instruction::{AccountMeta, Instruction, InstructionError},
        pubkey::Pubkey, rent::Rent,
    },
    solana_program_test::{processor, ProgramTest, ProgramTestContext},
    solana_sdk::{
        signature::{Keypair, Signer},
        transaction::{Transaction, TransactionError},
        transport,
    },
    solid_did::{
        borsh as program_borsh,
        error::SolidError,
        id, instruction,
        processor::process_instruction,
        state::{ClusterType, DistributedId, ServiceEndpoint, SolidData, VerificationMethod},
    },
};

fn program_test() -> ProgramTest {
    ProgramTest::new("solid_did", id(), processor!(process_instruction))
}

async fn initialize_did_account(
    context: &mut ProgramTestContext,
    authority: &Pubkey,
) -> transport::Result<()> {
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            authority,
            ClusterType::Development,
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(transaction).await
}

fn check_solid(data: SolidData, solid_key: Pubkey, authority: Pubkey) {
    let did = DistributedId::new(ClusterType::Development, solid_key);
    let verification_method = VerificationMethod::new(did.clone(), authority);
    assert_eq!(data.context, SolidData::default_context());
    assert_eq!(data.did, did);
    assert_eq!(data.verification_method, vec![verification_method.clone()]);
    assert_eq!(data.authentication, vec![verification_method.id.clone()]);
    assert_eq!(data.capability_invocation, vec![verification_method.id.clone()]);
    assert_eq!(data.capability_delegation, vec![]);
    assert_eq!(data.key_agreement, vec![]);
    assert_eq!(data.assertion_method, vec![]);
    assert_eq!(data.service, vec![]);
}

#[tokio::test]
async fn initialize_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    let (solid, _) = instruction::get_solid_address_with_seed(&authority);
    initialize_did_account(&mut context, &authority)
        .await
        .unwrap();
    let account_info = context
        .banks_client
        .get_account(solid)
        .await
        .unwrap()
        .unwrap();
    let account_data =
        program_borsh::try_from_slice_incomplete::<SolidData>(&account_info.data).unwrap();
    check_solid(account_data, solid, authority);
}

#[tokio::test]
async fn initialize_twice_fail() {
    let mut context = program_test().start_with_context().await;

    let authority = Pubkey::new_unique();
    initialize_did_account(&mut context, &authority)
        .await
        .unwrap();
    // doing what looks like the same transaction twice causes issues, so
    // move forward to ensure it looks different
    context.warp_to_slot(50).unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &context.payer.pubkey(),
            &authority,
            ClusterType::Development,
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
async fn write_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();

    let account_info = context
        .banks_client
        .get_account(solid)
        .await
        .unwrap()
        .unwrap();
    let mut solid_data =
        program_borsh::try_from_slice_incomplete::<SolidData>(&account_info.data).unwrap();
    let test_endpoint = ServiceEndpoint {
        id: solid_data.did.clone(),
        endpoint_type: "example".to_string(),
        endpoint: "example.com".to_string(),
    };
    solid_data.service.push(test_endpoint.clone());
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &solid,
            &authority.pubkey(),
            0,
            solid_data.try_to_vec().unwrap(),
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
        .get_account(solid)
        .await
        .unwrap()
        .unwrap();
    let new_solid_data =
        program_borsh::try_from_slice_incomplete::<SolidData>(&account_info.data).unwrap();
    assert_eq!(new_solid_data, solid_data);
}

#[tokio::test]
async fn write_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();

    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    let new_data = SolidData::new_sparse(DistributedId::new(ClusterType::Development, authority.pubkey()), authority.pubkey());
    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &solid,
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
            InstructionError::Custom(SolidError::IncorrectAuthority as u32)
        )
    );
}

#[tokio::test]
async fn write_fail_unsigned() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();

    let new_data = SolidData::new_sparse(DistributedId::new(ClusterType::Development, authority.pubkey()), authority.pubkey());
    let data = new_data.try_to_vec().unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::Write { offset: 0, data },
            vec![
                AccountMeta::new(solid, false),
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
    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();
    let recipient = Pubkey::new_unique();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction::close_account(
            &solid,
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
        1.max(Rent::default().minimum_balance(SolidData::LEN))
    );
}

#[tokio::test]
async fn close_account_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();
    let recipient = Pubkey::new_unique();

    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::close_account(
            &solid,
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
            InstructionError::Custom(SolidError::IncorrectAuthority as u32)
        )
    );
}

#[tokio::test]
async fn close_account_fail_unsigned() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let (solid, _) = instruction::get_solid_address_with_seed(&authority.pubkey());
    initialize_did_account(&mut context, &authority.pubkey())
        .await
        .unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::CloseAccount,
            vec![
                AccountMeta::new(solid, false),
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
