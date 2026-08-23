---
name: axp-summarize-session
description: End-of-session Agentic Experience Platform beta retrospective — scans the whole conversation, extracts every finding, and batch-files them as issues on grafana/design. Use at the end of a testing session to catch what wasn't filed in the moment, especially patterns across features that only show up in retrospect.
argument-hint: [optional focus or scope]
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/axp-summarize-session/SKILL.md
---

# Summarize session

End-of-session retrospective for Agentic Experience Platform (AXP) beta testing. Scan the full conversation, extract every AXP-related finding, and batch-file them as issues on `grafana/design`.

This skill sweeps a **whole session**. Its companion, `/axp-send-feedback`, files a single issue in the moment. Use this one at the end to catch what wasn't filed along the way — especially patterns across several features that only become visible in retrospect.

**Opening note.** If the user typed anything after the command, treat it as a scope for the sweep — a package, a feature, or a stretch of the session to concentrate on. With no note, scan the whole conversation.

Skip anything already filed earlier in the session. To check:

```bash
gh issue list --repo grafana/design --label feedback --author @me --limit 10
```

## Step 0: Preflight

Verify `gh` is installed and authenticated:

```bash
gh auth status
```

- **`gh` not found** — tell the user to install it (`brew install gh` on macOS, or see https://cli.github.com), then run `gh auth login`. Stop here.
- **Installed but not authenticated** — walk them through `gh auth login` → `GitHub.com` → `HTTPS` → `Login with a web browser`, then re-run `gh auth status` to confirm. Browser auth grants the `repo` scope this needs by default.
- **Authenticated** — confirm access to the target repo with `gh repo view grafana/design --json name`. If that fails, the user may not have access: tell them to request it or ask in `#team-product-design-engineering`.

Only proceed once all three pass.

## Step 1: Scan the session

Read the full conversation and find every point where AXP was involved — any UI work touching `@grafana/design-tokens`, `@grafana/components`, `@grafana/icons`, `@grafana/base-ui`, the `@grafana/design-mcp` server, or patterns from `AGENTS.md`.

For each, note the user's original prompt (verbatim where possible), what the agent produced, whether it worked or needed correction, and the correction dialogue if there was one.

Skip findings already filed via `/axp-send-feedback` in this session.

## Step 2: Collect environment info

Gather automatically, before categorizing:

- **Package versions** — read these from the consumer `package.json` where present, the same set `/axp-send-feedback` reports so the two are comparable: `@grafana/components`, `@grafana/base-ui`, `@grafana/ai-elements`, `@grafana/design-tokens`, `@grafana/theme-providers`, `@grafana/design-mcp`, `@grafana/design-setup`. `npm ls <names>` (or `pnpm ls`) also works when the tree is installed.
- **Consumer repo** — `gh repo view --json nameWithOwner --jq .nameWithOwner`
- **Branch** — `git branch --show-current`
- **Agent** — Cursor / Claude Code / Copilot / other; note the model if known. Ask when it isn't obvious rather than assuming — `design-setup` installs this command for Cursor as well, so guessing skews the beta signal.
- **Smoke check failed** — ask the user (yes / no / n/a)
- **MCP session log** — call the MCP tool `get_session_log_path`, read the JSONL, and summarize every row that flags a gap: any with `outcome: "miss"` **or** a `detail` set. That covers dead queries (`zero-results`, `unknown-component`, `known-component-no-usage`, `unknown-tool`) and detail-flagged hits like `unknown-prop` (component exists, wrong prop). Include each row's exact `args` + `detail`. This is session-wide evidence of where the design MCP came up empty; use it to corroborate findings, and repeat the summary in each filed issue's **MCP session log** section since the team reads issues individually. Skip if logging is off (`DESIGN_MCP_LOG=off`) or the MCP server isn't connected.

## Step 3: Categorize findings

Sort each finding into one of four categories, matching `/axp-send-feedback` and the beta testing guide:

- **Prompts that worked** — the feature came out right or close enough. Capture the prompt and what it produced; positive signal tells the team what not to break.
- **Prompts that didn't work** — wrong components, broken styling, ignored the design system, or invented tokens. Capture the prompt, what was produced, and what was expected.
- **Course corrections** — the user had to steer the agent: wrong pattern, ignored MCP guidance, several nudges. Capture the correction dialogue.
- **Unexpected or incorrect builds** — built something not asked for, misread intent, or subtly wrong (light-mode only, hardcoded colors).

For each finding also record **severity** (blocking, meaning the user could not proceed; or minor, meaning an annoyance with a workaround) and the **affected package**.

## Step 4: Present findings for review

Show a numbered summary grouped by category:

```
1. **Category:** [one of the four]
   **Severity:** [blocking | minor]
   **Affected package:** [package(s)]
   **Prompt:** [the original prompt or request]
   **What happened:** [1-2 sentences]
   **Proposed issue title:** [prefixed: Worked: / Didn't work: / Course correction: / Unexpected build:]
```

Then offer three choices: approve all, drop specific numbers, or edit individual findings before filing.

"Prompts that worked" findings are opt-in — present them, but note they file as positive signal rather than bugs, and respect a request to skip them all.

Cap at 10 issues per session. Beyond that, ask the user to pick the most important.

## Step 5: File the issues

Wait for explicit approval before creating anything. For each approved finding, write the body to a temp file and pass `--body-file`, so verbatim prompts survive quoting:

```bash
BODY_FILE=$(mktemp)
cat > "$BODY_FILE" << 'ISSUE_EOF'
[issue body content]
ISSUE_EOF
gh issue create --repo grafana/design \
  --title "<prefix>: <short summary>" \
  --label feedback \
  --body-file "$BODY_FILE"
rm "$BODY_FILE"
```

Title prefixes match the category: `Worked:`, `Didn't work:`, `Course correction:`, or `Unexpected build:`. If the `feedback` label is missing on the repo, file without it rather than blocking.

If `gh` fails, report which findings were filed and which weren't. Never claim an issue was created when the command failed.

After filing, return every issue URL and remind the user they can drag screenshots onto the GitHub issue pages.

## Issue body shape

```markdown
## Feedback type

[Prompts that worked | Prompts that didn't work | Course corrections | Unexpected or incorrect builds]

## Severity

[blocking | minor]

## Affected package

[e.g. @grafana/components, @grafana/design-mcp]

## Prompt(s)

[verbatim prompt text]

## What happened

[what the agent produced]

## Expected

[what should have happened — omit if not applicable]

## Course-correction dialogue

[the back-and-forth needed to fix it — omit if not applicable]

## MCP session log

[the session's design-MCP misses: exact queries + `detail` — omit if logging was off or the MCP server wasn't connected]

## Environment

- Consumer repo: …
- Agent: …
- Package versions: …
- Smoke check failed: yes/no/n/a

## Chat context

[short excerpt of relevant turns — omit if the prompts and outcomes above are complete]
```

## Rules

- If no AXP work happened this session, say so and stop.
- Do not fabricate findings. Report only what actually happened in the conversation.
- Raw prompts and correction dialogue are the highest-value signal — include them verbatim.
- Do not put AXP (or similar product codenames) in GitHub **labels**. Titles may mention AXP when useful.
- Reuse the `feedback` label and the title prefixes above so the team sees one unified backlog.
