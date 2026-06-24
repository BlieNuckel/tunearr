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

      # Importing this module also registers the overlay, so the module's
      # `services.tunearr.package` default (pkgs.tunearr) resolves without any
      # extra wiring on the consumer side.
      nixosModules.tunearr =
        { ... }:
        {
          imports = [ ./nix/module.nix ];
          nixpkgs.overlays = [ self.overlays.default ];
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
