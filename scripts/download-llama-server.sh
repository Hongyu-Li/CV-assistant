#!/usr/bin/env bash
set -euo pipefail

LLAMA_VERSION="b8740"
RELEASE_BASE="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}"

TARGET_DIR="$(cd "$(dirname "$0")/.." && pwd)/resources"

download_arch() {
  local arch="$1"
  local platform_suffix

  case "${arch}" in
    arm64)  platform_suffix="macos-arm64" ;;
    x86_64) platform_suffix="macos-x64"   ;;
    *)
      echo "ERROR: Unsupported architecture: ${arch}"
      return 1
      ;;
  esac

  local binary_name="llama-server-${arch}"
  local target_path="${TARGET_DIR}/${binary_name}"

  if [[ -f "${target_path}" ]]; then
    echo "✓ ${binary_name} already exists at ${target_path}"
    return 0
  fi

  local archive_name="llama-${LLAMA_VERSION}-bin-${platform_suffix}.tar.gz"
  local download_url="${RELEASE_BASE}/${archive_name}"
  local temp_dir
  temp_dir=$(mktemp -d)

  echo "Downloading ${archive_name} for ${arch}..."
  curl -fSL -o "${temp_dir}/${archive_name}" "${download_url}"

  echo "Extracting llama-server and dependencies..."
  tar xzf "${temp_dir}/${archive_name}" -C "${temp_dir}"

  # b8740 archive extracts to llama-b8740/ with flat layout (no bin/ or lib/ subdirs)
  local extracted_dir="${temp_dir}/llama-${LLAMA_VERSION}"

  if [[ ! -d "${extracted_dir}" ]]; then
    extracted_dir=$(find "${temp_dir}" -maxdepth 1 -type d -name "llama-*" | head -1)
    if [[ -z "${extracted_dir}" ]]; then
      echo "ERROR: Could not find extracted llama directory in archive"
      rm -rf "${temp_dir}"
      return 1
    fi
  fi

  # b8740 flat layout: llama-server sits in root; older formats use bin/ subdir
  local server_bin="${extracted_dir}/llama-server"
  if [[ ! -f "${server_bin}" && -f "${extracted_dir}/bin/llama-server" ]]; then
    server_bin="${extracted_dir}/bin/llama-server"
  fi

  if [[ ! -f "${server_bin}" ]]; then
    echo "ERROR: llama-server binary not found in archive"
    rm -rf "${temp_dir}"
    return 1
  fi

  mv "${server_bin}" "${target_path}"
  chmod +x "${target_path}"

  # Collect dylibs — flat layout (b8740) or lib/ subdir (older formats)
  local dylib_source="${extracted_dir}"
  if ! compgen -G "${extracted_dir}/lib*.dylib" > /dev/null 2>&1; then
    if [[ -d "${extracted_dir}/lib" ]]; then
      dylib_source="${extracted_dir}/lib"
    fi
  fi

  for f in "${dylib_source}/"lib*.dylib; do
    [[ -e "$f" ]] || continue
    local base
    base=$(basename "$f")
    if [[ -e "${TARGET_DIR}/${base}" ]]; then
      continue
    fi
    if [[ -L "$f" ]]; then
      cp -P "$f" "${TARGET_DIR}/"
    elif [[ -f "$f" ]]; then
      mv "$f" "${TARGET_DIR}/"
    fi
  done

  codesign --force --sign - "${target_path}" 2>/dev/null || echo "Warning: codesign failed for binary (non-fatal)"
  for dylib in "${TARGET_DIR}/"lib*.dylib; do
    if [[ -f "$dylib" && ! -L "$dylib" ]]; then
      codesign --force --sign - "$dylib" 2>/dev/null || echo "Warning: codesign failed for $(basename "$dylib") (non-fatal)"
    fi
  done

  rm -rf "${temp_dir}"
  echo "✓ Installed ${binary_name} to ${target_path}"
}

mkdir -p "${TARGET_DIR}"

if [[ "${1:-}" == "--all-arch" ]]; then
  echo "Downloading llama-server for all macOS architectures..."
  download_arch "arm64"
  download_arch "x86_64"
else
  ARCH=$(uname -m)
  download_arch "${ARCH}"
fi

echo "Done."
