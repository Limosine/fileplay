{ stdenv, ... }:

stdenv.mkDerivation {
  name = "fileplay-backend";
  version = "0.1";

  src = ../.;

  installPhase = ''
    mkdir $out
    cp -r ./backend ./common $out/
  '';
}
