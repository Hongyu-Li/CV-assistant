#!/usr/bin/env bash
set -euo pipefail

# Pin a specific llama.cpp release for reproducibility
# b8740 is required for Gemma 4 support (gemma4 architecture)
LLAMA_VERSION="b8740"
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

ARCHIVE_NAME="llama-${LLAMA_VERSION}-bin-${PLATFORM_SUFFIX}.tar.gz"
DOWNLOAD_URL="${RELEASE_BASE}/${ARCHIVE_NAME}"
TEMP_DIR=$(mktemp -d)

echo "Downloading ${ARCHIVE_NAME}..."
curl -fSL -o "${TEMP_DIR}/${ARCHIVE_NAME}" "${DOWNLOAD_URL}"

echo "Extracting llama-server and dependencies..."
tar xzf "${TEMP_DIR}/${ARCHIVE_NAME}" -C "${TEMP_DIR}"

# b8740 archive extracts to llama-b{version}-bin-{platform}/ directory
EXTRACTED_DIR="${TEMP_DIR}/llama-${LLAMA_VERSION}-bin-${PLATFORM_SUFFIX}"

# Fallback: try finding the extracted directory by pattern
if [[ ! -d "${EXTRACTED_DIR}" ]]; then
  EXTRACTED_DIR=$(find "${TEMP_DIR}" -maxdepth 1 -type d -name "llama-*" | head -1)
  if [[ -z "${EXTRACTED_DIR}" ]]; then
    echo "ERROR: Could not find extracted llama directory in archive"
    rm -rf "${TEMP_DIR}"
    exit 1
  fi
fi

# Verify llama-server binary exists
if [[ ! -f "${EXTRACTED_DIR}/bin/llama-server" ]]; then
  echo "ERROR: llama-server binary not found in archive"
  rm -rf "${TEMP_DIR}"
  exit 1
fi

# Move llama-server with arch-specific name
mv "${EXTRACTED_DIR}/bin/llama-server" "${TARGET_PATH}"
chmod +x "${TARGET_PATH}"

# Move all dylibs (including versioned files and symlinks) alongside the binary
# b8740 dylibs: libllama, libggml, libggml-base, libggml-metal, libggml-cpu,
# libggml-blas, libggml-rpc, libmtmd — each with versioned variants and symlinks
for f in "${EXTRACTED_DIR}/lib/"lib*.dylib; do
  if [[ -L "$f" ]]; then
    # Preserve symlinks
    cp -P "$f" "${TARGET_DIR}/"
  elif [[ -f "$f" ]]; then
    mv "$f" "${TARGET_DIR}/"
  fi
done

# Ad-hoc sign all binaries and dylibs for macOS
codesign --force --sign - "${TARGET_PATH}" 2>/dev/null || echo "Warning: codesign failed for binary (non-fatal)"
for dylib in "${TARGET_DIR}/"lib*.dylib; do
  # Only sign real files, not symlinks
  if [[ -f "$dylib" && ! -L "$dylib" ]]; then
    codesign --force --sign - "$dylib" 2>/dev/null || echo "Warning: codesign failed for $(basename "$dylib") (non-fatal)"
  fi
done

rm -rf "${TEMP_DIR}"

echo "✓ Installed ${BINARY_NAME} to ${TARGET_PATH}"
"${TARGET_PATH}" --version 2>/dev/null || true
