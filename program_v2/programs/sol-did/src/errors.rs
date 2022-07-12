use anchor_lang::error_code;

#[error_code]
pub enum DidSolError {
    #[msg("No VM with the given alias exists")]
    VmDoesNotExists,
    #[msg("Given VM alias is already in use")]
    VmAliasAlreadyInUse,
    #[msg("Cannot add a verification method with OwnershipProof flag")]
    VmOwnershipOnAdd,
    #[msg("ServiceID already exists in current service")]
    RepetitiveService,
    #[msg("ServiceID doesn't exists in current service")]
    NonExistingService,
}
