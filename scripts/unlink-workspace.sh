#!/usr/bin/env bash
set -euo pipefail

# unlink-workspace.sh — reverse `link-workspace.sh`. Reads
# `.workspace-link-backup.json` alongside the consumer's root
# `package.json` to know exactly which overrides, direct-dep specs,
# and target deps to restore, then re-runs the consumer's install
# command.
#
# Workflow:
#
#   1. Detect the consumer's package manager.
#   2. Load the backup file produced by link-workspace.sh.
#   3. Remove the override entries it recorded — from
#      `pnpm-workspace.yaml`'s sentinel-delimited block, or from
#      `pnpm.overrides` / `overrides` / `resolutions` in
#      `package.json`. Collapse empty containers.
#   4. Restore any direct-dep entries that link rewrote (for
#      npm/bun hybrid), across every workspace package.json the
#      backup recorded.
#   5. Remove any deps that `--target` added.
#   6. Delete the backup file.
#   7. Run the consumer's install command.
#
# Usage:
#
#   pnpm unlink-workspace <consumer-repo>

usage() {
  cat <<'EOF'
Usage:
  pnpm unlink-workspace <consumer-repo>

  <consumer-repo>  The repo to unlink.

Reads `.workspace-link-backup.json` alongside the consumer's root
package.json (written by link-workspace.sh) to reverse all of its
edits — overrides (YAML or JSON), direct-dep rewrites across the
workspace, and any --target sub-package additions. The consumer ends
up byte-equivalent to its pre-link state.
EOF
}

CONSUMER_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown flag: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -n "$CONSUMER_DIR" ]]; then
        echo "Error: unexpected positional argument: $1" >&2
        usage >&2
        exit 1
      fi
      CONSUMER_DIR="$1"
      shift
      ;;
  esac
done

if [[ -z "$CONSUMER_DIR" ]]; then
  echo "Error: consumer-repo path is required" >&2
  usage >&2
  exit 1
fi

if [[ ! -d "$CONSUMER_DIR" ]]; then
  echo "Error: consumer-repo not found: $CONSUMER_DIR" >&2
  exit 1
fi

CONSUMER_DIR="$(cd "$CONSUMER_DIR" && pwd)"
CONSUMER_PKG_JSON="$CONSUMER_DIR/package.json"
BACKUP_FILE="$CONSUMER_DIR/.workspace-link-backup.json"

if [[ ! -f "$CONSUMER_PKG_JSON" ]]; then
  echo "Error: no package.json at $CONSUMER_PKG_JSON" >&2
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "▶ No backup file found at $BACKUP_FILE — nothing to unlink."
  echo "  (Has the consumer been linked? If you cleaned up by hand, this is fine.)"
  exit 0
fi

detect_package_manager() {
  local pkg_json="$1"
  local consumer_dir="$2"

  local pm_field
  pm_field=$(node -p "require('$pkg_json').packageManager || ''" 2>/dev/null || echo "")
  if [[ -n "$pm_field" ]]; then
    case "$pm_field" in
      pnpm@*) echo "pnpm"; return ;;
      npm@*) echo "npm"; return ;;
      yarn@1.*) echo "yarn-classic"; return ;;
      yarn@*) echo "yarn-berry"; return ;;
      bun@*) echo "bun"; return ;;
    esac
  fi

  if [[ -f "$consumer_dir/pnpm-lock.yaml" ]]; then echo "pnpm"; return; fi
  if [[ -f "$consumer_dir/package-lock.json" ]]; then echo "npm"; return; fi
  if [[ -f "$consumer_dir/yarn.lock" ]]; then
    if [[ -f "$consumer_dir/.yarnrc.yml" ]]; then echo "yarn-berry"; return; fi
    echo "yarn-classic"; return
  fi
  if [[ -f "$consumer_dir/bun.lock" || -f "$consumer_dir/bun.lockb" ]]; then
    echo "bun"; return
  fi
  echo "unknown"
}

PM="$(detect_package_manager "$CONSUMER_PKG_JSON" "$CONSUMER_DIR")"
if [[ "$PM" == "unknown" ]]; then
  echo "Error: could not detect the consumer's package manager." >&2
  exit 1
fi

case "$PM" in
  pnpm)         INSTALL_CMD="pnpm install" ;;
  yarn-classic) INSTALL_CMD="yarn install" ;;
  yarn-berry)   INSTALL_CMD="yarn install" ;;
  npm)          INSTALL_CMD="npm install" ;;
  bun)          INSTALL_CMD="bun install" ;;
  *)
    echo "Error: internal — unhandled package manager: $PM" >&2
    exit 1
    ;;
esac

INSTALL_BIN="${INSTALL_CMD%% *}"
if ! command -v "$INSTALL_BIN" >/dev/null 2>&1; then
  echo "Error: $INSTALL_BIN (required for the consumer) is not on \$PATH." >&2
  echo "  Detected package manager: $PM" >&2
  exit 1
fi

echo "▶ Unlinking $CONSUMER_DIR"
echo "  Consumer package manager: $PM"
echo ""
echo "▶ Reverting edits recorded in ${BACKUP_FILE}…"

node - "$BACKUP_FILE" "$CONSUMER_PKG_JSON" <<'NODE'
'use strict';
const fs = require('fs');

const [, , backupPath, rootPkgJsonPath] = process.argv;
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

const YAML_START_MARKER = '  # --- @grafana/design link-workspace start ---';
const YAML_END_MARKER = '  # --- @grafana/design link-workspace end ---';

function writeJson(path, obj) {
  const original = fs.readFileSync(path, 'utf8');
  const trailing = original.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(path, JSON.stringify(obj, null, 2) + trailing);
}

// ── Overrides ────────────────────────────────────────────────────────
// New-format backup: backup.overrides = { file, format, jsonPath, addedKeys }.
// Legacy backup: backup.addedOverrides (flat array) with overrides assumed
//                in the root pkg.json under some pnpm.overrides/etc path
//                that's not recorded — fall back to scanning.

let overrideInfo = backup.overrides;

// Legacy migration: a top-level addedOverrides array without an
// overrides record. Assume root pkg.json + sniff the field.
if (!overrideInfo && Array.isArray(backup.addedOverrides)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgJsonPath, 'utf8'));
  let detectedPath = null;
  if (rootPkg.pnpm && rootPkg.pnpm.overrides) detectedPath = 'pnpm.overrides';
  else if (rootPkg.resolutions) detectedPath = 'resolutions';
  else if (rootPkg.overrides) detectedPath = 'overrides';
  if (detectedPath) {
    overrideInfo = {
      file: rootPkgJsonPath,
      format: 'json',
      jsonPath: detectedPath,
      addedKeys: backup.addedOverrides,
    };
  }
}

if (overrideInfo && overrideInfo.addedKeys && overrideInfo.addedKeys.length > 0) {
  if (overrideInfo.format === 'json') {
    const pkg = JSON.parse(fs.readFileSync(overrideInfo.file, 'utf8'));
    const segments = overrideInfo.jsonPath.split('.');
    const chain = [pkg];
    let cursor = pkg;
    let pathExists = true;
    for (const key of segments) {
      if (!cursor || typeof cursor !== 'object' || cursor[key] === undefined) {
        pathExists = false;
        break;
      }
      cursor = cursor[key];
      chain.push(cursor);
    }
    if (pathExists) {
      for (const name of overrideInfo.addedKeys) {
        if (Object.prototype.hasOwnProperty.call(cursor, name)) {
          delete cursor[name];
          console.log('  • ' + name + ' removed from ' + overrideInfo.jsonPath);
        }
      }
      // Collapse empty containers up the chain.
      for (let i = chain.length - 1; i >= 1; i -= 1) {
        const obj = chain[i];
        if (typeof obj === 'object' && obj !== null && Object.keys(obj).length === 0) {
          delete chain[i - 1][segments[i - 1]];
        } else {
          break;
        }
      }
    }
    writeJson(overrideInfo.file, pkg);
  } else if (overrideInfo.format === 'yaml') {
    const content = fs.readFileSync(overrideInfo.file, 'utf8');
    const lines = content.split('\n');
    const startIdx = lines.indexOf(YAML_START_MARKER);
    const endIdx = lines.indexOf(YAML_END_MARKER);
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      lines.splice(startIdx, endIdx - startIdx + 1);
      // If the resulting `overrides:` block is empty (no entries, just
      // the key), collapse it: find a line `^overrides:\s*$` followed
      // immediately by a non-indented line (or EOF) and remove it.
      const overridesLineIdx = lines.findIndex(l => /^overrides:\s*$/.test(l));
      if (overridesLineIdx !== -1) {
        const next = lines[overridesLineIdx + 1];
        if (next === undefined || /^[a-zA-Z_]/.test(next) || /^\s*$/.test(next)) {
          // Only collapse if we also created this block in the first place.
          // We can't know that for certain — to stay safe, only collapse
          // when nothing else lives under it. Walk forward looking for
          // any indented child.
          let hasChildren = false;
          for (let i = overridesLineIdx + 1; i < lines.length; i += 1) {
            if (/^[a-zA-Z_]/.test(lines[i])) break;
            if (/^\s+\S/.test(lines[i])) { hasChildren = true; break; }
          }
          if (!hasChildren) {
            lines.splice(overridesLineIdx, 1);
          }
        }
      }
      fs.writeFileSync(overrideInfo.file, lines.join('\n'));
      for (const name of overrideInfo.addedKeys) {
        console.log('  • ' + name + ' removed from ' + overrideInfo.file);
      }
    }
  }
}

// ── Direct-deps (hybrid strategy) ────────────────────────────────────
// New format: backup.directDeps = { [pkgJsonPath]: { [section]: { name: spec } } }
// Legacy format: backup.directDeps = { [section]: { name: spec } }
//                (no per-path keying — assume root)

const directDepsByPath = backup.directDeps || {};
let directDepsToProcess;
const keys = Object.keys(directDepsByPath);
const looksLikePathKeyed = keys.length === 0 || keys.every(k => k.endsWith('package.json') || k.endsWith('.json'));

if (looksLikePathKeyed) {
  directDepsToProcess = directDepsByPath;
} else {
  // Legacy: wrap under root.
  directDepsToProcess = { [rootPkgJsonPath]: directDepsByPath };
}

for (const [pkgJsonPath, sections] of Object.entries(directDepsToProcess)) {
  if (!fs.existsSync(pkgJsonPath)) {
    console.error('  ! skipping missing ' + pkgJsonPath);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  let touched = false;
  for (const [section, entries] of Object.entries(sections)) {
    for (const [name, originalSpec] of Object.entries(entries)) {
      if (pkg[section] && Object.prototype.hasOwnProperty.call(pkg[section], name)) {
        pkg[section][name] = originalSpec;
        touched = true;
        console.log('  • ' + name + ' (' + section + ') ← ' + originalSpec + '  in ' + pkgJsonPath);
      }
    }
  }
  if (touched) writeJson(pkgJsonPath, pkg);
}

// ── Added deps (from --target) ───────────────────────────────────────
const addedDeps = backup.addedDeps || {};
for (const [pkgJsonPath, sections] of Object.entries(addedDeps)) {
  if (!fs.existsSync(pkgJsonPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  let touched = false;
  for (const [section, names] of Object.entries(sections)) {
    if (!pkg[section]) continue;
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(pkg[section], name)) {
        delete pkg[section][name];
        touched = true;
        console.log('  • ' + name + ' (' + section + ') removed from ' + pkgJsonPath);
      }
    }
    if (Object.keys(pkg[section]).length === 0) {
      delete pkg[section];
    }
  }
  if (touched) writeJson(pkgJsonPath, pkg);
}
NODE

rm -f "$BACKUP_FILE"

echo ""
echo "▶ Running \`$INSTALL_CMD\` in the consumer…"
(cd "$CONSUMER_DIR" && $INSTALL_CMD)

echo ""
echo "✅ Done. $CONSUMER_DIR is back on its registry-resolved dependencies."
