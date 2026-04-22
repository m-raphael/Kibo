#!/usr/bin/env bash
# Installs pre-commit and activates the secret-scan hook.
# Run once per clone: bash scripts/setup-hooks.sh

set -e

if ! command -v pre-commit &>/dev/null; then
  echo "Installing pre-commit…"
  if command -v brew &>/dev/null; then
    brew install pre-commit
  elif command -v pip3 &>/dev/null; then
    pip3 install pre-commit
  else
    echo "ERROR: Neither brew nor pip3 found. Install pre-commit manually: https://pre-commit.com/#installation" >&2
    exit 1
  fi
fi

pre-commit install
echo "pre-commit hook installed. Staged secrets will be blocked on every commit."
