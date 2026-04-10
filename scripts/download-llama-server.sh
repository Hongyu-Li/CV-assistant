#!/usr/bin/env bash
set -euo pipefail

# Pin a specific llama.cpp release for reproducibility
LLAMA_VERSION="b5460"
RELEASE_BASE="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}"

ARCH=$(uname -m)
case "${ARCH}" in
  arm64)  PLATFORM_SUFFIX="macos-arm64" ;;
  x86_64) PLATFORM_SUFFIX="macos-x64"   ;;
  *)
    echo "ERROR: Unsupported architecture: ${ARCH}"
    exit 1
    ;;
esac

BINARY_NAME="llama-server-${ARCH}"
TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/resources"
TARGET_PATH="${TARGET_DIR}/${BINARY_NAME}"

# Idempotent: skip if binary already exists
if [[ -f "${TARGET_PATH}" ]]; then
  echo "✓ ${BINARY_NAME} already exists at ${TARGET_PATH}"
  "${TARGET_PATH}" --version 2>/dev/null || true
  exit 0
fi

mkdir -p "${TARGET_DIR}"

ARCHIVE_NAME="llama-${LLAMA_VERSION}-bin-${PLATFORM_SUFFIX}.zip"
DOWNLOAD_URL="${RELEASE_BASE}/${ARCHIVE_NAME}"
TEMP_DIR=$(mktemp -d)

echo "Downloading ${ARCHIVE_NAME}..."
curl -fSL -o "${TEMP_DIR}/${ARCHIVE_NAME}" "${DOWNLOAD_URL}"

echo "Extracting llama-server and dependencies..."
REQUIRED_FILES=(
  "build/bin/llama-server"
  "build/bin/libllama.dylib"
  "build/bin/libggml.dylib"
  "build/bin/libggml-base.dylib"
  "build/bin/libggml-metal.dylib"
  "build/bin/libggml-cpu.dylib"
  "build/bin/libggml-blas.dylib"
  "build/bin/libggml-rpc.dylib"
  "build/bin/ggml-metal.metal"
  "build/bin/ggml-common.h"
  "build/bin/ggml-metal-impl.h"
)

unzip -o -j "${TEMP_DIR}/${ARCHIVE_NAME}" "${REQUIRED_FILES[@]}" -d "${TEMP_DIR}/extracted"

if [[ ! -f "${TEMP_DIR}/extracted/llama-server" ]]; then
  echo "ERROR: llama-server binary not found in archive"
  rm -rf "${TEMP_DIR}"
  exit 1
fi

# Move llama-server with arch-specific name
mv "${TEMP_DIR}/extracted/llama-server" "${TARGET_PATH}"
chmod +x "${TARGET_PATH}"

# Move dylibs and metal shaders alongside the binary
for f in "${TEMP_DIR}/extracted/"*.dylib "${TEMP_DIR}/extracted/"ggml-metal.metal "${TEMP_DIR}/extracted/"ggml-common.h "${TEMP_DIR}/extracted/"ggml-metal-impl.h; do
  [[ -f "$f" ]] && mv "$f" "${TARGET_DIR}/"
done

# Ad-hoc sign all binaries and dylibs for macOS
codesign --force --sign - "${TARGET_PATH}" 2>/dev/null || echo "Warning: codesign failed for binary (non-fatal)"
for dylib in "${TARGET_DIR}/"*.dylib; do
  [[ -f "$dylib" ]] && codesign --force --sign - "$dylib" 2>/dev/null || echo "Warning: codesign failed for $(basename "$dylib") (non-fatal)"
done

rm -rf "${TEMP_DIR}"

echo "✓ Installed ${BINARY_NAME} to ${TARGET_PATH}"
"${TARGET_PATH}" --version 2>/dev/null || true
