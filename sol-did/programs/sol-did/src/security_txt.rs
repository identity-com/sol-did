pub mod security {
    use solana_security_txt::security_txt;

    #[cfg(not(feature = "no-entrypoint"))]
    security_txt! {
        // Required fields
        name: "Sol-DID",
        project_url: "https://github.com/identity-com/sol-did",
        contacts: "email: contact@identity.org",
        policy: "https://docs.identity.com/docs/sol-did/#policies",
        encryption: "https://docs.identity.com/pgp.txt",
        preferred_languages: "en",
        source_code: "https://github.com/identity-com/sol-did.git"
    }
}
