#!/usr/bin/env bash
# lwp installer — downloads the right binary for this OS/arch from GitHub Releases.
# Usage: curl -fsSL https://raw.githubusercontent.com/cartpauj/localwp-cli/main/scripts/install.sh | bash
set -euo pipefail

REPO="${LWP_REPO:-cartpauj/localwp-cli}"
VERSION="${LWP_VERSION:-latest}"
INSTALL_DIR="${LWP_INSTALL_DIR:-$HOME/.local/bin}"

uname_s="$(uname -s 2>/dev/null || echo Unknown)"
uname_m="$(uname -m 2>/dev/null || echo Unknown)"

case "$uname_s" in
  Linux*)  os="linux" ;;
  Darwin*) os="darwin" ;;
  MINGW*|MSYS*|CYGWIN*) os="windows" ;;
  *) echo "Unsupported OS: $uname_s" >&2; exit 1 ;;
esac

case "$uname_m" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) echo "Unsupported arch: $uname_m" >&2; exit 1 ;;
esac

# Windows binary is x64-only for now
if [ "$os" = "windows" ]; then arch="x64"; fi

ext=""
[ "$os" = "windows" ] && ext=".exe"

asset="lwp-${os}-${arch}${ext}"

if [ "$VERSION" = "latest" ]; then
  url="https://github.com/${REPO}/releases/latest/download/${asset}"
else
  url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
fi

mkdir -p "$INSTALL_DIR"
dest="${INSTALL_DIR}/lwp${ext}"

echo "Downloading $asset..."
if command -v curl >/dev/null 2>&1; then
  curl -fL --progress-bar "$url" -o "$dest"
elif command -v wget >/dev/null 2>&1; then
  wget --show-progress -qO "$dest" "$url"
else
  echo "Need curl or wget" >&2; exit 1
fi
chmod +x "$dest"

echo
echo "Installed: $dest"
case ":$PATH:" in
  *:"$INSTALL_DIR":*) ;;
  *) echo "Note: $INSTALL_DIR is not on your PATH. Add this to your shell rc:"
     echo "  export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
esac

"$dest" --version
