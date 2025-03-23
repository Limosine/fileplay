{ buildGoModule, ... }:

buildGoModule {
  pname = "fileplay-turn";
  version = "0.1";

  src = ./.;

  vendorHash = "sha256-mBQVnYgMqENn+QgukNJt7qhYmT9Ve9+gqn7FBYZ8Jog=";
}
