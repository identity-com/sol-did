use anchor_lang::error_code;

#[error_code]
pub enum RepetitiveServiceError {
    #[msg("serviceID already exists in current service")]
    RepetitiveService,
}

#[error_code]
pub enum NonExistingServiceError {
    #[msg("serviceID doesn't exists in current service")]
    NonExistingService,
}