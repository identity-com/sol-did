use anchor_lang::error_code;

#[error_code]
pub enum DidSolError {
    #[msg("No VM with the given alias exists")]
    VmAliasNotFound,
    #[msg("Given VM alias is already in use")]
    VmAliasAlreadyInUse,
    #[msg("Cannot add a verification method with OwnershipProof flag")]
    VmOwnershipOnAdd,
    #[msg("Removing the last verification method would lead to a lockout")]
    VmCannotRemoveLastAuthority,
    #[msg("ServiceID already exists in current service")]
    ServiceAlreadyExists,
    #[msg("ServiceID doesn't exists in current service")]
    ServiceNotFound,
    #[msg("Invalid other controllers. Invalid DID format or did:sol:<did>")]
    InvalidOtherControllers,
}
