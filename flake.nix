{
  description = "tunearr — self-hosted music request server";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: {
        tunearr = pkgs.callPackage ./nix/package.nix { };
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.tunearr;
      });

      overlays.default = _final: prev: {
        tunearr = prev.callPackage ./nix/package.nix { };
      };

      # Default the service package to the one built with THIS flake's nixpkgs,
      # so consumers on a different channel (e.g. a stable nixos release) don't
      # rebuild it against their nixpkgs — which would miss the pnpm/node
      # versions the build needs. mkDefault keeps it overridable.
      nixosModules.tunearr =
        { pkgs, lib, ... }:
        {
          imports = [ ./nix/module.nix ];
          services.tunearr.package = lib.mkDefault self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        };
      nixosModules.default = self.nixosModules.tunearr;

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
          ];
        };
      });
    };
}
