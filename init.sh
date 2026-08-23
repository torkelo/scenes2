#!/bin/bash

# init.sh - Quick validation script for agent sessions
# Run this at the start of each session to verify the project is in a working state

set -e

echo "=== Grafana Scenes v2 Monorepo Validation ==="
echo ""

# Check we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ ERROR: Not in monorepo root. Run from the grafana-design directory."
    exit 1
fi
echo "✓ In correct directory"

# Check node_modules exist
if [ ! -d "node_modules" ]; then
    echo "⚠ node_modules missing, running pnpm install..."
    pnpm install
fi
echo "✓ Dependencies installed"

# Run typecheck across all packages
echo ""
echo "Running typecheck across all packages..."
if pnpm turbo run typecheck 2>/dev/null; then
    echo "✓ TypeScript checks passed"
else
    echo "⚠ TypeScript checks failed (may need investigation)"
fi

# Run build across all packages
echo ""
echo "Testing build across all packages..."
if timeout 120 pnpm turbo run build 2>/dev/null; then
    echo "✓ All packages build successfully"
else
    echo "⚠ Build failed or timed out"
fi

echo ""
echo "=== Validation Complete ==="
echo ""
echo "Next steps:"
echo "1. Read AGENTS.md for operational context"
echo "2. Read specs/*.md for requirements"
echo "3. Pick a task and complete it"
