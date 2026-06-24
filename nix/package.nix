{
  lib,
  stdenv,
  nodejs_22,
  pnpm_10,
  python3,
  makeWrapper,
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "tunearr";
  version = "0.1.0";

  # Filter out generated/local dirs so the build input is reproducible and the
  # pnpmDeps hash stays stable across machines.
  src = lib.cleanSourceWith {
    src = ../.;
    filter =
      path: _type:
      let
        base = baseNameOf path;
      in
      !(builtins.elem base [
        "node_modules"
        "build"
        "config"
        "result"
      ]);
  };

  nativeBuildInputs = [
    nodejs_22
    pnpm_10.configHook
    python3 # node-gyp toolchain for better-sqlite3
    makeWrapper
  ];

  # Offline pnpm store. After changing dependencies, set `hash = lib.fakeHash;`,
  # rebuild, and copy the correct hash from the error message.
  pnpmDeps = pnpm_10.fetchDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 1;
    hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  };

  buildPhase = ''
    runHook preBuild
    pnpm run build
    runHook postBuild
  '';

  # The server runs the TypeScript sources directly via tsx (matching the
  # Dockerfile), so we ship server/, shared/, the built frontend, and the
  # already-installed node_modules. server/ and build/ must stay siblings
  # because index.ts resolves the static dir as path.join(__dirname, "..", "build").
  installPhase = ''
    runHook preInstall

    mkdir -p $out/libexec/tunearr
    cp -r build server shared node_modules package.json $out/libexec/tunearr/

    makeWrapper ${nodejs_22}/bin/node $out/bin/tunearr \
      --add-flags "$out/libexec/tunearr/node_modules/.bin/tsx" \
      --add-flags "--tsconfig $out/libexec/tunearr/server/tsconfig.json" \
      --add-flags "$out/libexec/tunearr/server/index.ts" \
      --set NODE_ENV production \
      --chdir $out/libexec/tunearr

    runHook postInstall
  '';

  meta = {
    description = "Self-hosted music request server";
    mainProgram = "tunearr";
    platforms = lib.platforms.linux;
  };
})
