use std::fs;
// Copy the IDL from the target directory before building or publishing the cpi library
fn main() -> std::io::Result<()> {
    fs::copy("../target/idl/sol_did.json", "idl.json")?;
    Ok(())
}
