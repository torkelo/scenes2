---
targets: [claude, codex]
name: axp-send-feedback
description: File Agentic Experience Platform beta tester feedback as a GitHub issue on grafana/design — prompts that worked, prompts that didn't, course corrections, or unexpected builds. Use when someone wants to report how the design packages behaved in their own repo.
claude:
  argument-hint: [what you want to report]
---

# Send feedback

File structured tester feedback as a GitHub issue on `grafana/design`. Use the current chat as evidence. Do not invent prompts or outcomes.

Target repo is always **`grafana/design`**. Label: **`feedback`**.

This skill files **one issue in the moment**. Its companion, `/axp-summarize-session`, sweeps a whole session at the end and batch-files whatever wasn't filed along the way.

**Opening note.** If the user typed anything after the command, treat it as their own description of what went wrong: seed the draft with it and ask follow-ups only for what's still missing. With no note, run the full interview from step 1.

## Steps

1. **Interview — feedback type**

   Ask which kind of feedback this is (exactly one issue unless they clearly want several):
   - **Prompts that worked** — the feature came out right, or close enough. Positive signal for what not to break.
   - **Prompts that didn't work** — wrong components, broken styling, ignored the design system, or invented tokens.
   - **Course corrections** — they had to nudge the agent (wrong pattern, ignored MCP guidance, several retries).
   - **Unexpected or incorrect builds** — built something they didn't ask for, misread intent, or subtle wrongs (light-only, hardcoded colors, etc.).

2. **Pull chat context**

   From this conversation, extract the raw user prompt(s), what the agent did, and what was produced. Prefer verbatim prompts over paraphrases. If the relevant prompt isn't clear, ask — do not invent it.

3. **Type-specific follow-ups**
   - **Worked:** what looked right or close enough?
   - **Didn't work:** what you got vs what you expected.
   - **Course corrections:** the correction dialogue / nudges that steered the agent.
   - **Unexpected builds:** what was asked vs what was built; any subtle incorrectness.

4. **Severity and affected package**

   Both appear in the issue body, so establish them here rather than guessing at draft time:
   - **Severity** — **blocking** if the user could not proceed, **minor** if there was an annoyance with a workaround. Infer it from the conversation where that's unambiguous, and ask when it isn't.
   - **Affected package** — which of `@grafana/components`, `@grafana/base-ui`, `@grafana/ai-elements`, `@grafana/design-tokens`, `@grafana/theme-providers`, `@grafana/icons`, or `@grafana/design-mcp` was involved. Several is fine. Omit the field only when genuinely no single package is implicated.

   These match `/axp-summarize-session`, so the two commands produce comparable issues.

5. **Screenshots**

   Ask if they have screenshots to attach. Create the issue first, return the URL, then tell them to drag images onto the GitHub issue page. Do not try to upload local image files via `gh`.

6. **Environment (gather automatically; show in the draft)**
   - Consumer repo: `gh repo view --json nameWithOwner --jq .nameWithOwner` (from the current working tree)
   - Agent product: Cursor / Claude Code / Copilot / other (ask if unclear)
   - Versions of these packages from the consumer `package.json` when present: `@grafana/components`, `@grafana/base-ui`, `@grafana/ai-elements`, `@grafana/design-tokens`, `@grafana/theme-providers`, `@grafana/design-mcp`, `@grafana/design-setup`
   - Smoke check failed?: yes / no / n/a (ask)

7. **Harvest the MCP session log**

   The `@grafana/design-mcp` server logs every tool call this session made, with a hit/miss outcome, to a local file. Fold it into the report as machine evidence of what the agent actually asked the design system and where it came up empty.

   - Call the MCP tool `get_session_log_path` to get this session's log file. If it reports logging disabled (`DESIGN_MCP_LOG=off`), or the design MCP server isn't connected, skip this section.
   - Read the JSONL and summarize it for the **MCP session log** body section: the call count, plus every row that flags a gap — any row with `outcome: "miss"` **or** a `detail` set. That covers dead queries (`zero-results`, `unknown-component`, `unknown-token`, `known-component-no-usage`, `unknown-tool`) and detail-flagged hits where the component exists but the agent got it wrong (`unknown-prop`). Include each row's exact `args` and `detail` — these are the most actionable lines in the report.
   - Keep the summary tight. Attach the raw JSONL in a collapsed `<details>` block only when it's short.

8. **Draft and confirm**

   Show the proposed title and body. Wait for explicit confirmation before creating the issue.

9. **Create the issue**

   ```bash
   gh issue create --repo grafana/design \
     --title "<type>: <short summary>" \
     --label feedback \
     --body-file <path-to-body.md>
   ```

   Title prefixes: `Worked:`, `Didn't work:`, `Course correction:`, or `Unexpected build:`.

   If the `feedback` label is missing on the repo, file without it rather than blocking — an unlabelled report still beats a lost one.

   Then return the issue URL and remind the user they can drag screenshots onto it.

10. **Auth / access failures**

    If `gh` isn't authenticated or can't open issues on `grafana/design`, stop. Tell the user to run `gh auth login` or share the draft in `#team-product-design-engineering`. Never claim the issue was filed if create failed.

## Issue body shape

```markdown
## Feedback type

[Prompts that worked | Prompts that didn't work | Course corrections | Unexpected or incorrect builds]

## Severity

[blocking | minor]

## Affected package

[e.g. @grafana/components, @grafana/design-mcp — omit if not applicable]

## Prompt(s)

…

## What happened

…

## Expected

… (omit if not applicable)

## Course-correction dialogue

… (omit if not applicable)

## MCP session log

… (call count + every miss with its exact query and `detail`; omit if logging was off or the design MCP server wasn't connected)

## Environment

- Consumer repo: …
- Agent: …
- Package versions: …
- Smoke check failed: yes/no/n/a

## Chat context

… (short excerpt of relevant turns; optional if prompts/outcomes above are complete)
```

## Rules

- Prefer raw prompt text plus what happened — that is the most useful signal.
- Do not put AXP (or similar product codenames) in GitHub **labels**. Titles may mention AXP when useful.
- Do not open the issue until the user confirms the draft.
- One feedback type per issue unless the user asks for more than one.
