{ pkgs ? import <nixpkgs> { } }:

let
  project = pkgs.callPackage ./yarn-project.nix { } { src = ./.; };

in project.overrideAttrs (oldAttrs: {

  installPhase = ''
    rm -rf $out
    mkdir -p $out
    cp -r ./package.json ./build $out
  '';
})
