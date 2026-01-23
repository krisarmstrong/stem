#!/bin/bash
# build-iperf3.sh - Download and build iperf3 from source for bundling
#
# Usage: ./scripts/build-iperf3.sh [VERSION]
#
# Builds a statically-linked iperf3 binary suitable for bundling
# with Stem packages. Output: bin/iperf3
#
# Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

set -euo pipefail

IPERF3_VERSION="${1:-3.18}"
IPERF3_TARBALL="iperf-${IPERF3_VERSION}.tar.gz"
IPERF3_URL="https://github.com/esnet/iperf/releases/download/${IPERF3_VERSION}/${IPERF3_TARBALL}"
BUILD_DIR="build/iperf3-build"
INSTALL_DIR="$(pwd)/build/iperf3-install"
OUTPUT_DIR="$(pwd)/bin"

echo "=== Building iperf3 ${IPERF3_VERSION} ==="

# Clean previous build
rm -rf "${BUILD_DIR}" "${INSTALL_DIR}"
mkdir -p "${BUILD_DIR}" "${INSTALL_DIR}" "${OUTPUT_DIR}"

# Download source
echo "Downloading iperf3 ${IPERF3_VERSION}..."
if command -v curl > /dev/null 2>&1; then
    curl -sL "${IPERF3_URL}" -o "${BUILD_DIR}/${IPERF3_TARBALL}"
elif command -v wget > /dev/null 2>&1; then
    wget -q "${IPERF3_URL}" -O "${BUILD_DIR}/${IPERF3_TARBALL}"
else
    echo "ERROR: curl or wget required"
    exit 1
fi

# Extract
echo "Extracting..."
tar -xzf "${BUILD_DIR}/${IPERF3_TARBALL}" -C "${BUILD_DIR}" --strip-components=1

# Configure and build
echo "Configuring..."
cd "${BUILD_DIR}"
./configure --prefix="${INSTALL_DIR}" --disable-shared --enable-static-bin \
    --without-sctp --without-openssl > /dev/null 2>&1 || \
./configure --prefix="${INSTALL_DIR}" --disable-shared \
    --without-sctp --without-openssl > /dev/null 2>&1

echo "Building..."
make -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)" > /dev/null 2>&1

echo "Installing..."
make install > /dev/null 2>&1

# Copy binary to output
cp "${INSTALL_DIR}/bin/iperf3" "${OUTPUT_DIR}/iperf3"
chmod 755 "${OUTPUT_DIR}/iperf3"

# Verify
echo ""
echo "=== Build Complete ==="
echo "  Binary: ${OUTPUT_DIR}/iperf3"
echo "  Version: $(${OUTPUT_DIR}/iperf3 --version 2>&1 | head -1 || echo "${IPERF3_VERSION}")"
ls -lh "${OUTPUT_DIR}/iperf3"

# Cleanup build artifacts
cd "$(pwd)"
rm -rf "${BUILD_DIR}" "${INSTALL_DIR}"
