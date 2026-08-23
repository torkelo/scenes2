#!/usr/bin/env bash
set -euo pipefail

# link-workspace.sh — point a consumer repo at this workspace's local
# packages instead of the published versions on npmjs.org.
#
# Two modes:
#
#   live mode (default)
#     Overrides resolve to each package's source directory via the
#     manager-appropriate symlink-style specifier:
#
#       pnpm        link:<abs/path>
#       yarn berry  portal:<abs/path>
#       npm / bun   file:<abs/path>    (npm 7+ symlinks for dir paths)
#
#     The consumer's `node_modules/@grafana/<name>` becomes a symlink
#     into this repo. Source edits propagate as soon as the package's
#     `dist/` is rebuilt — run `pnpm turbo run dev` in the workspace
#     root alongside the consumer to keep watch-mode builds going.
#
#   frozen mode (--frozen)
#     Build each package, `pnpm pack` into an output directory, and
#     point overrides at the .tgz files. Source changes require
#     re-running the script. Used automatically for yarn v1, whose
#     `resolutions` field copies on `file:` rather than symlinking.
#
# Where overrides land:
#
#   - pnpm 10+ workspace (consumer has `pnpm-workspace.yaml`) — into
#     that file's `overrides:` mapping, between sentinel comments.
#   - pnpm single-package — `pnpm.overrides` in `package.json`.
#   - yarn classic / berry — `resolutions` in root `package.json`.
#   - npm / bun — `overrides` in root `package.json`. For npm/bun
#     these managers reject overrides whose spec differs from a direct
#     dependency (EOVERRIDE), so the script also rewrites any direct-dep
#     entry — across every workspace `package.json`, not just the root —
#     that matches a workspace package.
#
# The `--target <sub-package>` flag (path or package name) adds each
# workspace package as a `dependencies` entry in that sub-package's
# `package.json`, with spec `*`. The override redirects the resolution.
# Use this when dogfooding a brand-new package the consumer doesn't yet
# list as a dep anywhere.
#
# `.workspace-link-backup.json` (alongside the consumer's root
# `package.json`) records everything the linker wrote so
# `unlink-workspace.sh` can reverse it byte-for-byte.
#
# Usage:
#
#   pnpm link-workspace <consumer-repo>
#   pnpm link-workspace <consumer-repo> --target apps/plugin
#   pnpm link-workspace <consumer-repo> --frozen
#   pnpm link-workspace <consumer-repo> --frozen --output-dir <dir>

usage() {
  cat <<'EOF'
Usage:
  pnpm link-workspace <consumer-repo> [--target <sub-pkg>] [--frozen] [--output-dir <dir>]

  <consumer-repo>     The repo whose configuration gets the edits.
  --target <sub-pkg>  Sub-package (path or package name) that should
                      gain each workspace package as a direct dep.
                      Useful when dogfooding a package the consumer
                      doesn't yet list anywhere. Ignored for single-
                      package consumers.
  --frozen            Pack tarballs and link to those instead of
                      symlinking source directories. Forced on for
                      yarn v1.
  --output-dir <dir>  --frozen only. Where to write the tarballs
                      (default: /tmp/grafana-workspace-pkgs).

The script auto-detects the consumer's package manager
(pnpm / npm / yarn classic / yarn berry / bun) and whether it's a
workspace (pnpm-workspace.yaml or `workspaces` field).

In live mode (default), the consumer's `node_modules/@grafana/<name>`
becomes a symlink to `packages/<name>/` in this repo. Run
`pnpm turbo run dev` in the workspace alongside the consumer to keep
watch-mode builds going.

In --frozen mode, tarballs are packed once and the consumer is pinned
to those exact builds.

Disconnect with: pnpm unlink-workspace <consumer-repo>
EOF
}

CONSUMER_DIR=""
FROZEN=0
OUTPUT_DIR="/tmp/grafana-workspace-pkgs"
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --frozen)
      FROZEN=1
      shift
      ;;
    --output-dir)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Error: --output-dir requires a directory path" >&2
        usage >&2
        exit 1
      fi
      OUTPUT_DIR="$1"
      shift
      ;;
    --target)
      shift
      if [[ $# -eq 0 ]]; then
        echo "Error: --target requires a sub-package path or name" >&2
        usage >&2
        exit 1
      fi
      TARGET="$1"
      shift
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

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Package-manager detection ────────────────────────────────────────────

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
  echo "  No \`packageManager\` field in $CONSUMER_PKG_JSON" >&2
  echo "  No recognised lockfile in $CONSUMER_DIR" >&2
  echo "  Set \`packageManager\` in package.json (Corepack convention) and re-run." >&2
  exit 1
fi

# yarn v1's `resolutions` copies on `file:` rather than symlinking, with
# no `portal:`/`link:` equivalent — fall back to frozen mode.
if [[ "$PM" == "yarn-classic" && "$FROZEN" -eq 0 ]]; then
  echo "▶ yarn v1 (classic) doesn't support symlink-style overrides; falling back to --frozen mode."
  FROZEN=1
fi

# Per-PM behaviour.
# OVERRIDES_JSON_PATH: dotted JSON path used when overrides land in
#   package.json (irrelevant when they land in pnpm-workspace.yaml).
# STRATEGY:      overrides → just write to the overrides field.
#                hybrid    → rewrite direct deps + write overrides for transitives.
# LIVE_PREFIX:   spec prefix used in live mode.
case "$PM" in
  pnpm)         OVERRIDES_JSON_PATH="pnpm.overrides"; INSTALL_CMD="pnpm install"; STRATEGY="overrides"; LIVE_PREFIX="link:" ;;
  yarn-classic) OVERRIDES_JSON_PATH="resolutions";    INSTALL_CMD="yarn install"; STRATEGY="overrides"; LIVE_PREFIX="" ;;
  yarn-berry)   OVERRIDES_JSON_PATH="resolutions";    INSTALL_CMD="yarn install"; STRATEGY="overrides"; LIVE_PREFIX="portal:" ;;
  npm)          OVERRIDES_JSON_PATH="overrides";      INSTALL_CMD="npm install";  STRATEGY="hybrid";    LIVE_PREFIX="file:" ;;
  bun)          OVERRIDES_JSON_PATH="overrides";      INSTALL_CMD="bun install";  STRATEGY="hybrid";    LIVE_PREFIX="file:" ;;
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

if [[ "$FROZEN" -eq 1 ]]; then
  MODE="frozen"
  mkdir -p "$OUTPUT_DIR"
else
  MODE="live"
fi

# ── Workspace detection ──────────────────────────────────────────────────
#
# For pnpm with pnpm-workspace.yaml: overrides go in that YAML file,
# not in package.json.
#
# For any workspace consumer (pnpm-workspace.yaml or `workspaces` in
# package.json): the hybrid strategy and --target flag need to walk all
# workspace package.json files.

WORKSPACE_OVERRIDES_FILE="$CONSUMER_PKG_JSON"
WORKSPACE_OVERRIDES_FORMAT="json"
PNPM_WORKSPACE_YAML="$CONSUMER_DIR/pnpm-workspace.yaml"

if [[ "$PM" == "pnpm" && -f "$PNPM_WORKSPACE_YAML" ]]; then
  WORKSPACE_OVERRIDES_FILE="$PNPM_WORKSPACE_YAML"
  WORKSPACE_OVERRIDES_FORMAT="yaml"
fi

get_workspace_patterns() {
  local consumer_dir="$1"
  local pm="$2"

  if [[ "$pm" == "pnpm" && -f "$consumer_dir/pnpm-workspace.yaml" ]]; then
    node -e "
      const fs = require('fs');
      const yaml = fs.readFileSync('$consumer_dir/pnpm-workspace.yaml', 'utf8');
      const m = yaml.match(/^packages:\s*\n((?:\s*-\s+.*\n?)+)/m);
      if (m) {
        for (const item of m[1].matchAll(/^\s*-\s+[\"']?([^\"'\n]+?)[\"']?\s*\$/gm)) {
          console.log(item[1].trim());
        }
      }
    "
  else
    node -e "
      const pkg = require('$consumer_dir/package.json');
      const ws = pkg.workspaces;
      const patterns = Array.isArray(ws) ? ws : (ws && Array.isArray(ws.packages) ? ws.packages : []);
      patterns.forEach(p => console.log(p));
    "
  fi
}

WORKSPACE_PATTERNS=()
while IFS= read -r pattern; do
  [[ -n "$pattern" ]] && WORKSPACE_PATTERNS+=("$pattern")
done < <(get_workspace_patterns "$CONSUMER_DIR" "$PM")

# Enumerate sub-package package.json files (excludes the root).
WORKSPACE_SUBPKG_JSONS=()
if [[ ${#WORKSPACE_PATTERNS[@]} -gt 0 ]]; then
  shopt -s nullglob
  for pattern in "${WORKSPACE_PATTERNS[@]}"; do
    for dir in "$CONSUMER_DIR"/$pattern; do
      if [[ -d "$dir" && -f "$dir/package.json" ]]; then
        WORKSPACE_SUBPKG_JSONS+=("$dir/package.json")
      fi
    done
  done
  shopt -u nullglob
fi

if [[ ${#WORKSPACE_PATTERNS[@]} -eq 0 ]]; then
  IS_WORKSPACE=0
else
  IS_WORKSPACE=1
fi

# ── --target resolution ──────────────────────────────────────────────────

TARGET_PKG_JSON=""
if [[ -n "$TARGET" ]]; then
  if [[ "$IS_WORKSPACE" -eq 0 ]]; then
    echo "Error: --target was given but the consumer is not a workspace." >&2
    echo "  For a single-package consumer, add the dep with your package manager directly." >&2
    exit 1
  fi

  # Try as a relative or absolute path first.
  resolved=""
  if [[ "$TARGET" == /* ]]; then
    candidate="$TARGET"
  else
    candidate="$CONSUMER_DIR/$TARGET"
  fi
  if [[ -d "$candidate" && -f "$candidate/package.json" ]]; then
    resolved="$candidate/package.json"
  fi

  # Otherwise try as a package name.
  if [[ -z "$resolved" && ${#WORKSPACE_SUBPKG_JSONS[@]} -gt 0 ]]; then
    for sp in "${WORKSPACE_SUBPKG_JSONS[@]}"; do
      name=$(node -p "require('$sp').name || ''")
      if [[ "$name" == "$TARGET" ]]; then
        resolved="$sp"
        break
      fi
    done
  fi

  if [[ -z "$resolved" ]]; then
    echo "Error: --target '$TARGET' didn't match any workspace sub-package." >&2
    echo "  Tried path: $candidate" >&2
    echo "  Tried name: $TARGET" >&2
    echo "  Available sub-packages:" >&2
    if [[ ${#WORKSPACE_SUBPKG_JSONS[@]} -gt 0 ]]; then
      for sp in "${WORKSPACE_SUBPKG_JSONS[@]}"; do
        name=$(node -p "require('$sp').name || ''")
        echo "    • $name  ($(dirname "$sp"))" >&2
      done
    fi
    exit 1
  fi

  TARGET_PKG_JSON="$resolved"
fi

# ── Workspace discovery (this repo) ──────────────────────────────────────

discover_packages() {
  local pkg_json
  for pkg_json in "$REPO_ROOT"/packages/*/package.json; do
    [[ -f "$pkg_json" ]] || continue
    local is_private name dir
    is_private=$(node -p "Boolean(require('$pkg_json').private)")
    if [[ "$is_private" == "true" ]]; then
      continue
    fi
    name=$(node -p "require('$pkg_json').name")
    dir=$(dirname "$pkg_json")
    echo "$name|$dir"
  done
}

PACKAGES=()
PACKAGE_DIRS=()
while IFS='|' read -r name dir; do
  PACKAGES+=("$name")
  PACKAGE_DIRS+=("$dir")
done < <(discover_packages)

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  echo "Error: no publishable workspace packages found under packages/" >&2
  exit 1
fi

# ── Summary ──────────────────────────────────────────────────────────────

echo "▶ Linking ${#PACKAGES[@]} workspace package(s) into $CONSUMER_DIR"
echo "  Consumer package manager: $PM  (mode: $MODE, strategy: $STRATEGY)"
if [[ "$WORKSPACE_OVERRIDES_FORMAT" == "yaml" ]]; then
  echo "  Overrides destination: $WORKSPACE_OVERRIDES_FILE (overrides: block, sentinel-delimited)"
else
  echo "  Overrides destination: $WORKSPACE_OVERRIDES_FILE ($OVERRIDES_JSON_PATH)"
fi
if [[ "$IS_WORKSPACE" -eq 1 ]]; then
  echo "  Consumer is a workspace (${#WORKSPACE_SUBPKG_JSONS[@]} sub-package(s) discovered)."
fi
if [[ -n "$TARGET_PKG_JSON" ]]; then
  echo "  Target for new direct deps: $TARGET_PKG_JSON"
fi
for pkg in "${PACKAGES[@]}"; do
  echo "  • $pkg"
done

# ── Build ────────────────────────────────────────────────────────────────

echo ""
echo "▶ Building…"
FILTERS=()
for pkg in "${PACKAGES[@]}"; do
  FILTERS+=("--filter=$pkg")
done
(cd "$REPO_ROOT" && pnpm turbo run build "${FILTERS[@]}")

# Compute the spec for each package.
SPECS=()
if [[ "$MODE" == "live" ]]; then
  for i in "${!PACKAGES[@]}"; do
    SPECS+=("${LIVE_PREFIX}${PACKAGE_DIRS[$i]}")
  done
else
  echo ""
  echo "▶ Packing into ${OUTPUT_DIR}…"
  for i in "${!PACKAGES[@]}"; do
    pkg="${PACKAGES[$i]}"
    out=$(pnpm --filter "$pkg" --silent pack --pack-destination "$OUTPUT_DIR")
    tarball=$(echo "$out" | tail -n 1)
    SPECS+=("file:${tarball}")
    echo "  • $pkg → $(basename "$tarball")"
  done
fi

# ── Edit consumer files ──────────────────────────────────────────────────

# Build the list of package.json files that the direct-dep scan should
# touch (hybrid strategy only). Root is always included; sub-packages too
# if this is a workspace.
SCAN_PKG_JSONS=("$CONSUMER_PKG_JSON")
if [[ "$IS_WORKSPACE" -eq 1 && ${#WORKSPACE_SUBPKG_JSONS[@]} -gt 0 ]]; then
  for sp in "${WORKSPACE_SUBPKG_JSONS[@]}"; do
    SCAN_PKG_JSONS+=("$sp")
  done
fi

echo ""
echo "▶ Editing consumer configuration…"
node - \
  "$BACKUP_FILE" \
  "$WORKSPACE_OVERRIDES_FILE" \
  "$WORKSPACE_OVERRIDES_FORMAT" \
  "$OVERRIDES_JSON_PATH" \
  "$STRATEGY" \
  "$TARGET_PKG_JSON" \
  "${PACKAGES[@]}" \
  -- "${SPECS[@]}" \
  -- "${SCAN_PKG_JSONS[@]}" <<'NODE'
'use strict';
const fs = require('fs');

const [
  ,
  ,
  backupPath,
  overridesFile,
  overridesFormat,   // "json" or "yaml"
  jsonOverridesPath, // dotted path used when format=json
  strategy,          // "overrides" or "hybrid"
  targetPkgJson,     // path or "" if no --target
  ...rest
] = process.argv;

// rest = [...names, "--", ...specs, "--", ...scanPkgJsons]
const sep1 = rest.indexOf('--');
const sep2 = rest.indexOf('--', sep1 + 1);
if (sep1 === -1 || sep2 === -1) {
  console.error('Internal error: missing -- separators in node args');
  process.exit(1);
}
const names = rest.slice(0, sep1);
const specs = rest.slice(sep1 + 1, sep2);
const scanPkgJsons = rest.slice(sep2 + 1);

if (names.length !== specs.length) {
  console.error('Internal error: mismatched names/specs');
  process.exit(1);
}

const DEP_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies'];
const YAML_START_MARKER = '  # --- @grafana/design link-workspace start ---';
const YAML_END_MARKER = '  # --- @grafana/design link-workspace end ---';

// ── Load or init backup ──────────────────────────────────────────────
let backup = {
  overrides: { file: '', format: '', jsonPath: '', addedKeys: [] },
  directDeps: {},  // { [pkgJsonPath]: { [section]: { [name]: originalSpec } } }
  addedDeps: {},   // { [pkgJsonPath]: { [section]: [name, ...] } }
};
if (fs.existsSync(backupPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    // Migrate old format if needed.
    if (existing.overrides) backup.overrides = existing.overrides;
    if (existing.directDeps) backup.directDeps = existing.directDeps;
    if (existing.addedDeps) backup.addedDeps = existing.addedDeps;
    // Legacy backup field (pre-workspace-aware): { directDeps: { [section]: { name: spec } } }
    // Re-key by root pkg.json path so the old shape survives.
    if (existing.directDeps && !Object.values(existing.directDeps).every(v => v && typeof v === 'object' && Object.values(v).every(s => typeof s === 'object'))) {
      // The old shape has section→{name:spec}. Wrap it under the root.
      // We don't know the root here without context, so leave as-is and trust
      // unlink to handle either shape. (See unlink-workspace.sh.)
    }
    // Legacy: addedOverrides (a flat array of names) → migrate to addedKeys.
    if (Array.isArray(existing.addedOverrides) && !backup.overrides.addedKeys.length) {
      backup.overrides.addedKeys = existing.addedOverrides;
    }
  } catch (e) {
    console.error('Warning: failed to parse existing backup, starting fresh');
  }
}

// ── Write the overrides ─────────────────────────────────────────────
backup.overrides.file = overridesFile;
backup.overrides.format = overridesFormat;
backup.overrides.jsonPath = overridesFormat === 'json' ? jsonOverridesPath : '';

if (overridesFormat === 'json') {
  // pnpm.overrides / overrides / resolutions in a JSON file.
  const pkg = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
  const original = fs.readFileSync(overridesFile, 'utf8');
  const trailing = original.endsWith('\n') ? '\n' : '';

  function getOrCreate(root, path) {
    const segments = path.split('.');
    let cursor = root;
    for (const key of segments) {
      if (cursor[key] === undefined || cursor[key] === null) cursor[key] = {};
      cursor = cursor[key];
    }
    return cursor;
  }

  const overrides = getOrCreate(pkg, jsonOverridesPath);
  const addedKeys = new Set(backup.overrides.addedKeys);

  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const spec = specs[i];

    // Hybrid strategy: check every scanned pkg.json for a direct dep
    // matching `name`. If found, rewrite it there (backed up by path).
    // Then add the override only if no direct hit was found at all
    // (else npm rejects with EOVERRIDE).
    let directHit = false;
    if (strategy === 'hybrid') {
      directHit = handleHybridDirectDeps(name, spec, overridesFile, pkg);
    }

    if (!directHit) {
      overrides[name] = spec;
      addedKeys.add(name);
    }
    console.log('  • ' + name + ' (overrides → ' + jsonOverridesPath + ') → ' + spec);
  }

  backup.overrides.addedKeys = Array.from(addedKeys);
  fs.writeFileSync(overridesFile, JSON.stringify(pkg, null, 2) + trailing);
} else if (overridesFormat === 'yaml') {
  // pnpm-workspace.yaml — append entries to the `overrides:` block,
  // delimited by sentinel comments.
  let content = fs.readFileSync(overridesFile, 'utf8');
  let lines = content.split('\n');

  // Remove any existing sentinel block (idempotent re-run).
  let startIdx = lines.indexOf(YAML_START_MARKER);
  let endIdx = lines.indexOf(YAML_END_MARKER);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    lines.splice(startIdx, endIdx - startIdx + 1);
  }

  const addedKeys = [];
  // Hybrid strategy isn't reachable with YAML overrides (pnpm doesn't
  // have EOVERRIDE), but we still run the direct-dep scan when the
  // consumer is pnpm-on-workspace because the hybrid scan is unused.
  // For pnpm we always emit every entry as an override.
  for (let i = 0; i < names.length; i += 1) {
    addedKeys.push(names[i]);
  }

  const block = [
    YAML_START_MARKER,
    ...names.map((n, i) => `  ${JSON.stringify(n)}: ${JSON.stringify(specs[i])}`),
    YAML_END_MARKER,
  ];

  // Find the `overrides:` line (top-level key).
  const overridesLineIdx = lines.findIndex(l => /^overrides:\s*$/.test(l));
  if (overridesLineIdx === -1) {
    // No overrides block yet — create one at the end of the file.
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push('overrides:', ...block);
  } else {
    // Find the end of the overrides block. We scan forward, treating
    // indented lines and blank lines inside the block as "still inside",
    // and stopping at any column-0 content — either a new top-level
    // YAML key or a top-level comment (which YAML doesn't bind to a
    // section but humans typically use as a section break). We then
    // insert immediately after the last indented (overrides-content)
    // line, leaving any trailing blank lines before the next section in
    // place.
    let lastIndentedIdx = overridesLineIdx;
    for (let i = overridesLineIdx + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === '') {
        // Blank lines could be in the middle of the block or the start
        // of a section break — keep scanning, but don't update
        // lastIndentedIdx.
        continue;
      }
      if (/^\s/.test(line)) {
        // Indented line — part of the overrides mapping.
        lastIndentedIdx = i;
        continue;
      }
      // Column-0 content — end of overrides block.
      break;
    }
    lines.splice(lastIndentedIdx + 1, 0, ...block);
  }

  fs.writeFileSync(overridesFile, lines.join('\n'));
  for (const n of names) {
    console.log('  • ' + n + ' (overrides → ' + overridesFile + ')');
  }
  backup.overrides.addedKeys = addedKeys;
}

// ── Hybrid direct-dep scan across all workspace pkg.jsons ───────────
// Defined here so it can close over the scan list and backup. When the
// scanned pkg.json is the same file as `overridesFile` (the JSON file
// we're going to write overrides into), we modify `inMemoryPkg` instead
// of reading/writing the file separately — the outer code's final
// writeFileSync(overridesFile, …) would otherwise clobber our edit.
function handleHybridDirectDeps(name, spec, overridesFilePath, inMemoryPkg) {
  let anyHit = false;
  for (const pkgJsonPath of scanPkgJsons) {
    if (!fs.existsSync(pkgJsonPath)) continue;
    const isOverridesPkg = pkgJsonPath === overridesFilePath;
    let pkg;
    let trailing = '';
    if (isOverridesPkg) {
      pkg = inMemoryPkg;
    } else {
      const text = fs.readFileSync(pkgJsonPath, 'utf8');
      pkg = JSON.parse(text);
      trailing = text.endsWith('\n') ? '\n' : '';
    }
    let touched = false;
    for (const section of DEP_SECTIONS) {
      if (pkg[section] && Object.prototype.hasOwnProperty.call(pkg[section], name)) {
        backup.directDeps[pkgJsonPath] = backup.directDeps[pkgJsonPath] || {};
        backup.directDeps[pkgJsonPath][section] = backup.directDeps[pkgJsonPath][section] || {};
        if (!Object.prototype.hasOwnProperty.call(backup.directDeps[pkgJsonPath][section], name)) {
          backup.directDeps[pkgJsonPath][section][name] = pkg[section][name];
        }
        pkg[section][name] = spec;
        touched = true;
        anyHit = true;
        console.log('    ↳ rewrote in ' + pkgJsonPath + ' (' + section + ')');
      }
    }
    if (touched && !isOverridesPkg) {
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + trailing);
    }
  }
  return anyHit;
}

// ── --target: add deps to a sub-package ─────────────────────────────
if (targetPkgJson) {
  const text = fs.readFileSync(targetPkgJson, 'utf8');
  const pkg = JSON.parse(text);
  const trailing = text.endsWith('\n') ? '\n' : '';
  pkg.dependencies = pkg.dependencies || {};
  backup.addedDeps[targetPkgJson] = backup.addedDeps[targetPkgJson] || {};
  backup.addedDeps[targetPkgJson].dependencies = backup.addedDeps[targetPkgJson].dependencies || [];
  const addedList = new Set(backup.addedDeps[targetPkgJson].dependencies);
  let touched = false;
  for (const name of names) {
    const alreadyDeclared = DEP_SECTIONS.some(s => pkg[s] && Object.prototype.hasOwnProperty.call(pkg[s], name));
    if (alreadyDeclared) continue;
    pkg.dependencies[name] = '*';
    addedList.add(name);
    touched = true;
    console.log('  • ' + name + ' added to ' + targetPkgJson + ' (dependencies: *)');
  }
  backup.addedDeps[targetPkgJson].dependencies = Array.from(addedList);
  if (touched) {
    fs.writeFileSync(targetPkgJson, JSON.stringify(pkg, null, 2) + trailing);
  }
}

// ── Persist backup ──────────────────────────────────────────────────
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2) + '\n');
NODE

# ── Install ──────────────────────────────────────────────────────────────

echo ""
echo "▶ Running \`$INSTALL_CMD\` in the consumer…"
(cd "$CONSUMER_DIR" && $INSTALL_CMD)

echo ""
if [[ "$MODE" == "live" ]]; then
  echo "✅ Done. $CONSUMER_DIR now resolves the linked packages via symlinks into"
  echo "   this workspace. Source edits propagate as soon as each package's dist/"
  echo "   is rebuilt — run \`pnpm turbo run dev\` in $REPO_ROOT alongside the"
  echo "   consumer to keep watch-mode builds going."
else
  echo "✅ Done. $CONSUMER_DIR now resolves the linked packages from the tarballs"
  echo "   in $OUTPUT_DIR. Re-run this script after editing source files to refresh"
  echo "   the tarballs; the next install in the consumer picks them up."
fi
echo ""
if [[ "$STRATEGY" == "hybrid" ]]; then
  echo "   Note: $PM doesn't permit overriding a direct dependency, so the script"
  echo "   rewrote any direct-dep entries that matched a workspace package across"
  echo "   the consumer's workspace. Originals are saved in $BACKUP_FILE — keep"
  echo "   that file present until you run unlink-workspace."
  echo ""
fi
if [[ "$PM" == "yarn-berry" && "$MODE" == "frozen" ]]; then
  echo "   yarn berry note: if your changes don't appear after a re-link, clear"
  echo "   yarn's content cache with: yarn cache clean"
  echo ""
fi
echo "   Disconnect with:  pnpm unlink-workspace $CONSUMER_DIR"
