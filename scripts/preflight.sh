#!/usr/bin/env bash
set -euo pipefail

# Runs the same checks as CI, in the same order.
# Use this locally before pushing to catch failures early.

echo "▶ Build"
pnpm build

echo "▶ Lint"
pnpm lint

echo "▶ Typecheck"
pnpm typecheck

echo "▶ Format check"
pnpm format:check

echo "▶ Test"
pnpm test

echo "✅ All checks passed"
