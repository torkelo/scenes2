---
name: slack-issue
description: Create a GitHub issue from one or more Slack post links plus optional extra context, filed against the repository you're working in by default (e.g. `grafana/design` when run there) or another repo you name. Use when someone shares Slack conversation/message links and wants an issue filed about the topic raised.
argument-hint: <slack-permalink(s)> [additional context]
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/slack-issue/SKILL.md
---

# Slack → GitHub issue

Turn one or more Slack posts into a well-formed GitHub issue, shaped by any extra
context the user passes as an argument. By default, file the issue against
**the repository you're working in**; the user can name a different target repo
in their context.

## Inputs

The skill argument contains, in any order:

- **One or more Slack message permalinks** (conversation item links) — e.g.
  `https://grafana.slack.com/archives/C09N762DJUE/p1781001391123456`, copied via
  Slack's _Copy link_. A link to a reply inside a thread also carries
  `?thread_ts=…&cid=…`.
- **Optional additional context** as free text — extra framing, the desired
  angle or scope, acceptance criteria, a proposed title, a preferred label, and
  optionally a **target repo** (e.g. "file this in `grafana/foo`"). Treat this as
  **authoritative**: let it steer the issue's framing and scope, with the Slack
  thread supplying the detail and evidence.

## Target repository

Unless the user names a specific repo, file the issue against the **current
repository** — the one the working directory belongs to:

```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
```

Run inside `grafana/design` this resolves to `grafana/design` (the historical
default); run in any other checkout with `gh` configured it resolves to that
repo. If the user's context names a target (e.g. "open this in `grafana/foo`"),
that wins. If neither resolves — no git remote, or `gh` can't determine the
repo — stop and ask which `owner/repo` to file against; don't guess.

## Prerequisites

- The **Slack MCP server** is connected and authenticated (the
  `mcp__plugin_slack_slack__*` tools resolve). An installed plugin is not enough —
  its OAuth must be completed. If the tools aren't available, stop and tell the
  user to connect/authorize the Slack plugin (`/reload-plugins` should then
  report at least one plugin MCP server).
- **`gh`** is authenticated with access to the target repo
  (`gh repo view <owner/repo>`). If the repo defines issue templates
  (`.github/ISSUE_TEMPLATE/`, surfaced by `gh issue create`), prefer the
  closest-fitting template; otherwise a clean free-form body is expected.
  (`grafana/design` has no templates.)

## Steps

1. **Separate the inputs.** Pull the Slack permalink(s) — and any explicit
   target-repo mention — out of the argument and treat the remaining prose as the
   user's additional context. If there's no Slack link, stop and ask for at least
   one (don't invent a topic).

2. **Resolve the target repo** as described under _Target repository_ — an
   explicit mention from the user wins, otherwise the current repo via
   `gh repo view`. Confirm it exists and you have access
   (`gh repo view <owner/repo>`) before drafting.

3. **Parse each permalink** into a channel + timestamp:
   - `…/archives/<CHANNEL_ID>/p<DIGITS>` → `channel = <CHANNEL_ID>` and
     `ts = <first 10 digits>.<remaining 6 digits>` (insert a `.` six digits from
     the end of the `p…` number).
   - If the URL has `?thread_ts=<TS>&cid=<CID>`, the link points at a reply
     inside a thread — capture `thread_ts` and `cid` as well.

4. **Read the source from Slack.** Use the Slack plugin's read tools (namespace
   `mcp__plugin_slack_slack__*`) to fetch the message **and its full thread**, so
   you capture the whole discussion rather than a single line:
   - Threaded link (has `thread_ts`) → read the thread for `channel` +
     `thread_ts` (`mcp__plugin_slack_slack__slack_read_thread`, or the plugin's
     thread-reading tool).
   - Standalone message → read a small window of channel history around `ts`
     with `mcp__plugin_slack_slack__slack_read_channel` (bracket the timestamp
     with `oldest`/`latest`) to get the post plus any immediate replies/context.
   - If a tool name differs from the above, list the available
     `mcp__plugin_slack_slack__*` tools and use the closest read/thread tool.
   - Resolve author user IDs to display names where it aids attribution
     (`mcp__plugin_slack_slack__slack_search_users` or the plugin's user-lookup
     tool).
   - Read every link provided; note whether they're one topic or several (see
     Edge cases).

5. **Synthesize the topic.** From the thread(s) plus the user's additional
   context, work out the actual ask — a bug, a feature/enhancement, a design
   question, a token/component gap, etc. The additional context is authoritative
   for framing and scope; the thread supplies specifics and evidence.

6. **Draft the issue.** Compose the issue for the target repo:
   - **Title** — concise and specific. A title proposed in the user's context
     wins.
   - **Body** (free-form markdown), roughly:
     - a one-paragraph **summary** of the problem/ask;
     - **Context / details** distilled from the thread — paraphrase; quote
       sparingly, don't dump the whole transcript;
     - the user's **additional context**, woven in;
     - a **Source** section linking back to each Slack thread with attribution,
       e.g. `Raised by <name> in #<channel> on YYYY-MM-DD — <permalink>`.
   - Suggest a **label** only if it already exists in the target repo's label set
     (`gh label list --repo <owner/repo>`); common fits are `bug`, `enhancement`,
     `question`, `documentation`. Only existing labels can be applied — confirm
     before adding.
   - **Do not** copy secrets, tokens, or personal data from Slack into the
     issue — summarize instead.

7. **Confirm before creating.** Creating a GitHub issue is outward-facing and
   not cleanly reversible. Show the user the final **title, body, target repo
   (`<owner/repo>`), and any labels**, and get explicit approval (offer to edit).
   Do not create the issue until they confirm.

8. **Create it.** Run
   `gh issue create --repo <owner/repo> --title "<title>" --body "<body>" [--label <label> …]`.
   Pass the body via a temp file (`--body-file`) or a quoted heredoc so markdown
   and newlines are preserved.

9. **Report.** Return the new issue URL and a one-line summary. If — and only if
   — the user asks, offer to post the issue link back into the Slack thread.

## Edge cases

- **No Slack link in the input** → ask for at least one permalink.
- **Link won't parse / isn't a Slack archive URL** → show what you got and ask
  for the _Copy link_ permalink.
- **Can't determine the target repo** (no git remote, `gh` can't resolve the
  current repo, and no repo named in the context) → ask the user which
  `owner/repo` to file against.
- **Slack read fails** (private channel you're not a member of, deleted message,
  MCP not connected/authenticated) → report which link failed and why; continue
  with any that succeeded, or stop if none did.
- **Multiple links** → if they're one topic, fold them into a single issue with
  multiple Source entries; if they're clearly separate topics, ask whether to
  open one combined issue or several.
- **No additional context provided** → proceed from the thread alone, but still
  confirm the draft before creating.
- **`gh` not authenticated / no access to the target repo** → stop and tell the
  user to `gh auth login` or request repo access.

## Notes

- Always keep attribution and the Slack source link in the issue for
  traceability.
- Apply only labels that already exist in the target repo (`gh label list`); a
  repo with no issue templates (like `grafana/design`) takes a clean free-form
  body as the norm.
