#!/usr/bin/env bash
# Decides what release.yml should do, and writes it to $GITHUB_OUTPUT:
#
#   mode=release  a new version to tag, publish and point `release` at
#   mode=rebuild  re-publish the newest existing release (scheduled base-image refresh)
#   mode=none     nothing to do
#
# plus `version` (X.Y.Z, no leading v) and `ref` (the commit or tag to build).
#
# A push releases only when package.json's version differs from the commit before
# the push. Without that check, the first Dependabot merge to touch package.json
# would publish whatever version happened to be untagged. A manual dispatch skips
# it, which is how a version that never got a tag is released after the fact.
set -euo pipefail

event="${1:?usage: detect-release.sh <event> [before-sha]}"
before="${2:-}"
out="${GITHUB_OUTPUT:-/dev/stdout}"

emit() {
  echo "$1=$2" >>"$out"
}

package_version() {
  git show "$1:package.json" | node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => process.stdout.write(JSON.parse(raw).version ?? ""));
  '
}

latest_tag() {
  git tag --list 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -n 1
}

if [ "$event" = "schedule" ]; then
  tag=$(latest_tag)
  if [ -z "$tag" ]; then
    echo "No release exists yet, so there is no image to rebuild."
    emit mode none
    exit 0
  fi
  emit mode rebuild
  emit version "${tag#v}"
  emit ref "$tag"
  exit 0
fi

version=$(package_version HEAD)
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::package.json version '$version' is not X.Y.Z."
  exit 1
fi

if [ "$event" = "push" ]; then
  if [ -z "$before" ] || [ "$before" = "0000000000000000000000000000000000000000" ]; then
    echo "No previous commit to compare against."
    emit mode none
    exit 0
  fi
  previous=$(package_version "$before")
  if [ "$previous" = "$version" ]; then
    echo "package.json changed but its version is still $version."
    emit mode none
    exit 0
  fi
fi

if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "v$version is already released."
  emit mode none
  exit 0
fi

newest=$(latest_tag)
if [ -n "$newest" ] && [ "$(printf '%s\n%s\n' "$newest" "v$version" | sort -V | tail -n 1)" != "v$version" ]; then
  echo "::error::v$version is older than the newest release $newest."
  exit 1
fi

echo "Releasing v$version."
emit mode release
emit version "$version"
emit ref "$(git rev-parse HEAD)"
