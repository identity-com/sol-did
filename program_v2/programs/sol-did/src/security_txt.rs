
pub mod security {
    use solana_security_txt::security_txt;

    security_txt! {
        // Required fields
        name: "Sol-DID",
        project_url: "https://github.com/identity-com/sol-did",
        contacts: "email: contact@identity.org",
        policy: "https://github.com/identity-com/sol-did/blob/develop/README.md",
        encryption: "
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    Comment: Use this to send encrypted message to Identity.com for sol-did problems

    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
    utUWJVD0Ttxdxtc=
    =a86/
    -----END PGP PUBLIC KEY BLOCK-----
    ",
        preferred_languages: "en",
        source_code: "https://github.com/identity-com/sol-did.git"
    }
}
