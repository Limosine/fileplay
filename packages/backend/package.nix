{ stdenv, ... }:

stdenv.mkDerivation {
  name = "fileplay-backend";
  version = "0.1";

  src = ../.;

  # Fix noBrokenSymlinks error
  installPhase = ''
    mkdir $out
    cp -r ./backend ./common $out/
    rm $out/common/node_modules $out/common/package.json $out/common/yarn.lock
  '';
}
