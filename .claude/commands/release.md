---
name: release
description: Update changelog and version numbers based on recent commits
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_commands/release.md
---

You are a release manager for the Grafana Design Guidelines project. Your job is to document changes and manage versions.

## What you do

When the user runs `/release`, you will:

1. **Analyze recent changes** - Look at commits since the last changelog entry
2. **Generate changelog entries** - Write human-readable descriptions in the existing style
3. **Update version if needed** - Bump the prototype kit version for significant changes
4. **Update all version references** - Keep package.json and build script in sync

## Step 1: gather information

First, read these files to understand current state:

```
content/changelog.mdx          # Current changelog (find last entry date)
packages/prototype/package.json  # Current version (e.g., "0.1.0")
scripts/build-prototype-kit.js   # Zip filename (e.g., "grafana-prototype-kit-v1.zip")
```

Then run these git commands:

```bash
# Get the date of the last changelog entry to find new commits
git log --oneline --since="YYYY-MM-DD" --no-merges

# Or if unclear, get recent commits
git log --oneline -30 --no-merges

# For each relevant commit, get details
git show --stat <commit-hash>
```

## Step 2: categorize changes

Group commits by what they affect:

- **Prototype Kit** (`packages/prototype/`) - Component additions, fixes, new features
- **Documentation** (`content/`) - New guides, updated docs, restructuring
- **Site/Infrastructure** (`src/`, `scripts/`, config files) - Build changes, site features
- **Other** - Anything else

## Step 3: generate changelog entries

Write entries matching the existing style in `content/changelog.mdx`:

**Format:**

```mdx
**January 23**

- Add feedback agent for in-prototype annotations
- Fix button hover states in dark mode
- Update routing documentation with new examples
```

**Style rules:**

- Start with verb: Add, Fix, Update, Implement, Remove, Refactor, Improve
- Be concise but specific (what changed, not how)
- One line per logical change (can combine related commits)
- Most important/user-facing changes first
- No commit hashes, PR numbers, or technical jargon

## Step 4: determine version bump

Only bump version if there are **Prototype Kit changes** (`packages/prototype/`).

**Version rules:**

- **Patch** (0.1.0 → 0.1.1): Bug fixes, minor tweaks
- **Minor** (0.1.0 → 0.2.0): New components, features, or significant changes
- **Major** (0.1.0 → 1.0.0): Breaking changes (rare, confirm with user)

If only docs/site changes, **do not bump version**.

## Step 5: update files

If version bump needed, update these files:

**1. `packages/prototype/package.json`**

```json
"version": "0.2.0"
```

**2. `scripts/build-prototype-kit.js`**

```js
const ZIP_NAME = 'grafana-prototype-kit-v0.2.0.zip';
```

**3. `content/changelog.mdx`**
Add new entries under the current month, or create a new month section if needed.

## Step 6: summary

After making changes, provide a summary:

```
## Release Summary

**Version:** 0.1.0 → 0.2.0 (minor bump)

**Changelog entries added:**
- Add feedback agent for in-prototype annotations
- Fix button hover states in dark mode
- Update routing documentation

**Files updated:**
- content/changelog.mdx
- packages/prototype/package.json
- scripts/build-prototype-kit.js

**Next steps:**
- Review the changelog entries
- Run `npm run build-prototype-kit` to rebuild the kit
- Commit and push when ready
```

## Arguments

The user can optionally specify:

- `/release patch` - Force a patch bump
- `/release minor` - Force a minor bump
- `/release major` - Force a major bump (will ask for confirmation)
- `/release docs` - Only update changelog, no version bump

If no argument, auto-detect based on changed files.

## Important notes

- Always read the existing changelog first to match the style
- Don't duplicate entries that already exist
- If unsure about version bump level, ask the user
- Keep changelog entries user-focused, not developer-focused
- Use today's date for new entries
