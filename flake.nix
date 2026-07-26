{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs";
  };

  outputs = { self, flake-utils, nixpkgs }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        common = with pkgs; [ nodejs corepack ];

        pnpm = "${pkgs.corepack}/bin/corepack pnpm";

        scripts = with pkgs; [
          (writeScriptBin "clean" ''
            rm -rf dist
          '')

          (writeScriptBin "setup" ''
            clean
            ${pnpm} install
          '')

          (writeScriptBin "build" ''
            setup
            ${pnpm} run build
          '')

          (writeScriptBin "dev" ''
            setup
            ${pnpm} run dev $@
          '')

          (writeScriptBin "format" ''
            setup
            ${pnpm} run format
          '')

          (writeScriptBin "check-types" ''
            ${pnpm} run typecheck
          '')

          (writeScriptBin "preview" ''
            build
            ${pnpm} run preview
          '')
        ];

        runLocal = pkgs.writeScriptBin "run-local" ''
          rm -rf dist
          ${pnpm} install
          ${pnpm} run build
          ${pnpm} run preview
        '';
      in {
        devShells = {
          # The shell for developing this site
          default = pkgs.mkShell { buildInputs = common ++ scripts; };
        };

        apps.default = flake-utils.lib.mkApp { drv = runLocal; };
      });
}
