{ buildGoModule, ... }:

buildGoModule {
  pname = "fileplay-turn";
  version = "0.1";

  src = ./.;

  vendorHash = "sha256-F/RQtnndhm/RSEhFJ1XQG8RUKekpz/PQaJvReXC5ZzY=";
}
