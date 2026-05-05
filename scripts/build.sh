#!/usr/bin/env bash
# Cross-compile lwp into self-contained binaries via Bun.
# Requires Bun installed locally: https://bun.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p dist

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for building binaries. Install: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

TARGETS=(
  "bun-linux-x64:lwp-linux-x64"
  "bun-linux-arm64:lwp-linux-arm64"
  "bun-darwin-x64:lwp-darwin-x64"
  "bun-darwin-arm64:lwp-darwin-arm64"
  "bun-windows-x64:lwp-windows-x64.exe"
)

for entry in "${TARGETS[@]}"; do
  target="${entry%%:*}"
  out="${entry##*:}"
  echo "Building $out for $target..."
  bun build --compile --minify --target="$target" \
    --outfile="dist/$out" \
    src/index.js
done

echo
echo "Built:"
ls -lh dist/
