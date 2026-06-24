{
  lib,
  stdenv,
  nodejs,
  pnpm,
  fetchPnpmDeps,
  pnpmConfigHook,
  node-gyp,
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
    nodejs
    pnpm
    pnpmConfigHook
    node-gyp # not on PATH under pnpm (unlike npm); needed to compile better-sqlite3
    python3 # node-gyp toolchain
    makeWrapper
  ];

  # Offline pnpm store. After changing dependencies, set `hash = lib.fakeHash;`,
  # rebuild, and copy the correct hash from the error message.
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 3;
    hash = "sha256-uWjlVVehPhN2BoywjbSX/UvIZM4zYQNPVWfoK+Is6H8=";
  };

  # pnpmConfigHook installs with --ignore-scripts, so native modules are not
  # compiled. Rebuild better-sqlite3 from source against this build's node
  # headers. The env keeps node-gyp fully offline inside the sandbox:
  #   - npm_config_nodedir + NIX_NODEJS_BUILDNPMPACKAGE: use local headers,
  #     don't download them;
  #   - npm_config_build_from_source: skip the prebuild-install network fetch;
  #   - HOME: give node-gyp a writable cache dir (~/.cache is unwritable here).
  preBuild = ''
    export HOME=$TMPDIR
    export npm_config_nodedir=${nodejs}
    export npm_config_build_from_source=true
    export NIX_NODEJS_BUILDNPMPACKAGE=1
    pnpm rebuild better-sqlite3
  '';

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

    makeWrapper ${nodejs}/bin/node $out/bin/tunearr \
      --add-flags "$out/libexec/tunearr/node_modules/tsx/dist/cli.mjs" \
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
