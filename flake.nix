{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";

    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs@{ nixpkgs, flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      perSystem = { pkgs, ... }: {
        packages.backend = pkgs.callPackage ./packages/backend/package.nix {};
        packages.turn = pkgs.callPackage ./packages/turn/package.nix {};
      };
    };
}
