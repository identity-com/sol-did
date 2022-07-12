import { DidSolService } from "../dist/src";
import { AnchorProvider, web3 } from "@project-serum/anchor";

// Fixture account
const didIdentifier = new web3.PublicKey(
  "GYUg7UEDo2VtitTrvA7RGqWjBWmy8wuSApDqcCWKoVW4"
);

(async () => {
  const provider = AnchorProvider.env();
  const service = await DidSolService.build(provider, didIdentifier);

  console.log("Authority: " + provider.wallet.publicKey.toBase58());
  const didDoc = await service.resolve();

  // const [_, derivedPass] = await service.derivePass([constituentPass], {
  //   expireOnUse: true,
  //   expireDuration: 365 * 24 * 60 * 60, // expires in 1 year - an expireOnUse token must have some expiry time already set
  //   refreshDisabled: true,
  // });
  //
  // console.log("Authority: " + provider.wallet.publicKey.toBase58());
  console.log("DidDoc: " + JSON.stringify(didDoc, null, 2));
})().catch(console.error);
