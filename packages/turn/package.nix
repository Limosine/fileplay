{ buildGoModule, ... }:

buildGoModule {
  pname = "fileplay-turn";
  version = "0.1";

  src = ./.;

  vendorHash = "sha256-D4h72KTU6hxzllvGFzLSBnPieofZnW9CSB96O4LM5Fo=";
}
