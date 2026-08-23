---
name: snag
description: Fix bugs, issues, and small improvements by launching focused fix agents.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_commands/snag.md
---

Fix bugs, issues, and small improvements by launching focused fix agents.

## Usage

`/snag <description>` - Fix a single issue
`/snag - <item1> - <item2> - ...` - Fix multiple issues sequentially

## Examples

```
/snag header overflows on mobile
/snag - Fix mobile nav bug - Update button contrast - Remove unused imports
```

## What you do

For each issue:

1. **Launch agent** with Skill tool:

   ```
   skill: "snag-fixer"
   ```

   The agent receives the issue description and fixes it.

2. **Report result**:
   - Success: "✓ Fixed: <issue> (commit: abc123)"
   - Failure: "✗ Failed: <issue> - <reason>"

3. **Continue to next issue** if multiple provided

## Rules

- Process issues **sequentially** (one at a time)
- Do NOT use `run_in_background` - wait for each agent
- Each agent locates, fixes, builds, and commits independently
- Keep the main conversation clean - let agents do the work

## When complete

```
Fixed 3 of 4 issues:
✓ Fix mobile nav bug (commit: abc123)
✓ Update button contrast (commit: def456)
✓ Remove unused imports (commit: ghi789)
✗ Fix complex race condition - Requires architectural change
```
