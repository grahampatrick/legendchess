#!/usr/bin/env bash
# Installs the pinned Stockfish for CI (ubuntu x86-64). The golden pipeline
# test asserts the engine identifies as this major version and skips otherwise,
# so an engine bump is always an explicit two-line PR: this pin + the golden.
set -euo pipefail

VERSION="sf_18"
ASSET="stockfish-ubuntu-x86-64-avx2"

curl -fsSL -o /tmp/stockfish.tar \
  "https://github.com/official-stockfish/Stockfish/releases/download/${VERSION}/${ASSET}.tar"
tar -xf /tmp/stockfish.tar -C /tmp
install -m 0755 "/tmp/stockfish/${ASSET}" /usr/local/bin/stockfish

echo quit | stockfish | head -1
