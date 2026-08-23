#!/bin/bash
set -euo pipefail

# Migrate an external Git repository into this monorepo as a package,
# preserving full commit history using git subtree.
#
# Usage: ./scripts/migrate-package.sh <repo-url> <package-name>
# Example: ./scripts/migrate-package.sh git@github.com:grafana/design-tokens.git design-tokens

if [ $# -lt 2 ]; then
  echo "Usage: $0 <repo-url> <package-name>"
  echo ""
  echo "  repo-url     SSH or HTTPS URL of the source repository"
  echo "  package-name Directory name under packages/ (e.g. design-tokens)"
  echo ""
  echo "Example:"
  echo "  $0 git@github.com:grafana/design-tokens.git design-tokens"
  exit 1
fi

REPO_URL="$1"
PACKAGE_NAME="$2"
TARGET_DIR="packages/$PACKAGE_NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: $TARGET_DIR already exists"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migrating: $REPO_URL"
echo "Target:    $TARGET_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "[1/5] Adding subtree with full history..."
git subtree add --prefix="$TARGET_DIR" "$REPO_URL" main --squash

echo ""
echo "[2/5] Adding publishConfig to package.json..."
PACKAGE_JSON="$TARGET_DIR/package.json"
if [ -f "$PACKAGE_JSON" ]; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf-8'));

    pkg.publishConfig = { registry: 'https://npm.pkg.github.com' };
    pkg.repository = {
      type: 'git',
      url: 'https://github.com/grafana/design.git',
      directory: '$TARGET_DIR'
    };

    fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "  Updated $PACKAGE_JSON"
else
  echo "  Warning: No package.json found at $PACKAGE_JSON"
fi

echo ""
echo "[3/5] Running pnpm install to register the new workspace..."
pnpm install

echo ""
echo "[4/5] Verifying workspace registration..."
pnpm ls --depth 0 --filter "@grafana/$PACKAGE_NAME" 2>/dev/null && echo "  Package registered" || echo "  Warning: Package not found in workspace. Check the name field in package.json."

echo ""
echo "[5/5] Migration complete."
echo ""
echo "Next steps:"
echo "  1. Review the imported code at $TARGET_DIR/"
echo "  2. Add typecheck/lint/build scripts if missing"
echo "  3. Create an initial changeset: pnpm changeset"
echo "  4. Deprecate the old package in its original registry"
echo ""
