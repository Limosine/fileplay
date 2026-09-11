{ buildGoModule, ... }:

buildGoModule {
  pname = "fileplay-turn";
  version = "0.1";

  src = ./.;

  vendorHash = "sha256-BB/9hghK3NXmozbX/wlLsy1+6+pCgPDd4578CQJzc3o=";
}
