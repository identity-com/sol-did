use anchor_lang::error_code;

#[error_code]
pub enum DidSolError {
    #[msg("No VM with the given fragment exists")]
    VmFragmentNotFound,
    #[msg("Given VM fragment is already in use")]
    VmFragmentAlreadyInUse,
    #[msg("Cannot add a verification method with guarded flag (OwnershipProof or Protected)")]
    VmGuardedFlagOnAdd,
    #[msg("Removing the last verification method would lead to a lockout")]
    VmCannotRemoveLastAuthority,
    #[msg("Service already exists in current service list")]
    ServiceFragmentAlreadyInUse,
    #[msg("Service doesn't exists in current service list")]
    ServiceFragmentNotFound,
    #[msg("Invalid other controllers. Invalid DID format or did:sol:<did>")]
    InvalidOtherControllers,
    #[msg("Invalid native controllers. Cannot set itself as a controller")]
    InvalidNativeControllers,
    #[msg("Initial Account size is insufficient for serialization")]
    InsufficientInitialSize,
    #[msg("Could not convert between data types")]
    ConversionError,
    #[msg("Invalid chain of controlling DidAccounts")]
    InvalidControllerChain,
    #[msg("An error occurred while validating Secp256k1 signature")]
    ErrorValidatingSecp256k1Signature,
    #[msg("Wrong Authority for given DID")]
    WrongAuthorityForDid,
    #[msg("Cannot remove a protected verification method. You need to first remove the Protected Verification Method Flag in order for this operation to succeed")]
    VmCannotRemoveProtected,
}
