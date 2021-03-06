// Mark this test as BPF-only due to current `ProgramTest` limitations when CPIing into the system program
#![cfg(feature = "test-bpf")]

use {
    borsh::BorshSerialize,
    solana_program::{
        instruction::{AccountMeta, Instruction, InstructionError},
        pubkey::Pubkey,
        rent::Rent,
        system_instruction,
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
        state::{ClusterType, DistributedId, SolidData, VerificationMethod},
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

/*
#[tokio::test]
async fn initialize_with_seed_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let seed = "storage";
    let account = Pubkey::create_with_seed(&authority.pubkey(), seed, &id()).unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[
            system_instruction::create_account_with_seed(
                &context.payer.pubkey(),
                &account,
                &authority.pubkey(),
                seed,
                1.max(Rent::default().minimum_balance(SolidData::LEN)),
                SolidData::LEN as u64,
                &id(),
            ),
            instruction::initialize(&account, &authority.pubkey()),
            instruction::write(&account, &authority.pubkey(), 0, data.try_to_vec().unwrap()),
        ],
        Some(&context.payer.pubkey()),
        &[&context.payer, &authority],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();
    let account_data = context
        .banks_client
        .get_account_data_with_borsh::<SolidData>(account)
        .await
        .unwrap();
    assert_eq!(account_data.data, data);
    assert_eq!(account_data.authority, authority.pubkey());
    assert_eq!(account_data.version, SolidData::CURRENT_VERSION);
}

#[tokio::test]
async fn initialize_twice_fail() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::initialize(
            &account.pubkey(),
            &authority.pubkey(),
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
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &account.pubkey(),
            &authority.pubkey(),
            0,
            new_data.try_to_vec().unwrap(),
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

    let account_data = context
        .banks_client
        .get_account_data_with_borsh::<SolidData>(account.pubkey())
        .await
        .unwrap();
    assert_eq!(account_data.data, new_data);
    assert_eq!(account_data.authority, authority.pubkey());
    assert_eq!(account_data.version, SolidData::CURRENT_VERSION);
}

#[tokio::test]
async fn write_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let new_data = Data {
        bytes: [200u8; Data::DATA_SIZE],
    };
    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &account.pubkey(),
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
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let data = Data {
        bytes: [200u8; Data::DATA_SIZE],
    }
    .try_to_vec()
    .unwrap();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::Write { offset: 0, data },
            vec![
                AccountMeta::new(account.pubkey(), false),
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
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();
    let recipient = Pubkey::new_unique();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction::close_account(
            &account.pubkey(),
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
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::CloseAccount,
            vec![
                AccountMeta::new(account.pubkey(), false),
                AccountMeta::new_readonly(wrong_authority.pubkey(), true),
                AccountMeta::new(Pubkey::new_unique(), false),
            ],
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
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::CloseAccount,
            vec![
                AccountMeta::new(account.pubkey(), false),
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
async fn set_authority_success() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();
    let new_authority = Keypair::new();

    let transaction = Transaction::new_signed_with_payer(
        &[instruction::set_authority(
            &account.pubkey(),
            &authority.pubkey(),
            &new_authority.pubkey(),
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

    let account_data = context
        .banks_client
        .get_account_data_with_borsh::<SolidData>(account.pubkey())
        .await
        .unwrap();
    assert_eq!(account_data.authority, new_authority.pubkey());

    let new_data = Data {
        bytes: [200u8; Data::DATA_SIZE],
    };
    let transaction = Transaction::new_signed_with_payer(
        &[instruction::write(
            &account.pubkey(),
            &new_authority.pubkey(),
            0,
            new_data.try_to_vec().unwrap(),
        )],
        Some(&context.payer.pubkey()),
        &[&context.payer, &new_authority],
        context.last_blockhash,
    );
    context
        .banks_client
        .process_transaction(transaction)
        .await
        .unwrap();

    let account_data = context
        .banks_client
        .get_account_data_with_borsh::<SolidData>(account.pubkey())
        .await
        .unwrap();
    assert_eq!(account_data.data, new_data);
    assert_eq!(account_data.authority, new_authority.pubkey());
    assert_eq!(account_data.version, SolidData::CURRENT_VERSION);
}

#[tokio::test]
async fn set_authority_fail_wrong_authority() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let wrong_authority = Keypair::new();
    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::SetAuthority,
            vec![
                AccountMeta::new(account.pubkey(), false),
                AccountMeta::new_readonly(wrong_authority.pubkey(), true),
                AccountMeta::new(Pubkey::new_unique(), false),
            ],
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
async fn set_authority_fail_unsigned() {
    let mut context = program_test().start_with_context().await;

    let authority = Keypair::new();
    let account = Keypair::new();
    initialize_did_account(&mut context, &authority, &account)
        .await
        .unwrap();

    let transaction = Transaction::new_signed_with_payer(
        &[Instruction::new_with_borsh(
            id(),
            &instruction::SolidInstruction::SetAuthority,
            vec![
                AccountMeta::new(account.pubkey(), false),
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
*/
