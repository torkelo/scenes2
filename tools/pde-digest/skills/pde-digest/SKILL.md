---
name: pde-digest
description: Generate a digest of PDE-relevant activity since the last 9am UK digest window — 9 team channels, grafana/design PRs and issues opened in that window, and any @mentions of the user that need response — and DM it to the current user. Use when the user types /pde-digest or asks for "today's digest", "the digest", "summarize what's happening on PDE", etc.
---

# PDE Digest

Generate a daily digest of recent PDE-relevant activity from multiple sources and DM it to the user running the skill.

Sources are gathered in parallel and combined into a single Slack-formatted message that's scannable in under a minute.

## Time window

Match the scheduled GitHub Actions digest: a **contiguous 9am–9am UK window** (`Europe/London`), not a rolling 24 hours.

| Run day (UK) | Window                               | Subtitle label             |
| ------------ | ------------------------------------ | -------------------------- |
| Monday       | Fri 9am – Mon 9am (includes weekend) | `Since 9am Fri (UK)`       |
| Tue–Fri      | Yesterday 9am – today 9am            | `Since 9am yesterday (UK)` |

**Compute the window first** (from the `grafana/design` repo root):

```bash
pnpm --filter @grafana/pde-digest run window
```

Parse the JSON: `oldest` and `latest` are Unix seconds (window boundaries); `label` is the subtitle string (e.g. `Since 9am yesterday (UK)`).

Convert for GitHub search:

```bash
WINDOW=$(pnpm --filter @grafana/pde-digest run window 2>/dev/null | tail -1)
OLDEST=$(echo "$WINDOW" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).oldest)")
LATEST=$(echo "$WINDOW" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).latest)")
LABEL=$(echo "$WINDOW" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).label)")
CREATED_SINCE=$(date -u -r "$OLDEST" +%Y-%m-%dT%H:%M:%SZ)
CREATED_UNTIL=$(date -u -r "$LATEST" +%Y-%m-%dT%H:%M:%SZ)
```

If not in the `grafana/design` repo, approximate with the table above and `TZ=Europe/London date` to find the most recent 9am UK boundary.

Use `oldest` / `latest` for Slack; use `CREATED_SINCE` / `CREATED_UNTIL` for `gh` search. Pass `label` in the digest subtitle.

## Data sources

### 1. Team channels (digest window, filter for human signal)

Read messages from the **digest window** in each of these 9 channels using `mcp__plugin_slack_slack__slack_read_channel`:

| ID            | Name                                       |
| ------------- | ------------------------------------------ |
| `C09N762DJUE` | `#team-product-design-engineering-private` |
| `C091JCGU9T2` | `#team-product-design-engineering`         |
| `C0B7Z1TDU68` | `#team-ai-product-design-private`          |
| `C0B3D3Q8T34` | `#team-ai-product-design`                  |
| `C087DSU74ER` | `#product-design`                          |
| `C01LBUD42LE` | `#team-product-design-private`             |
| `C0587R32AM9` | `#ai-at-grafana`                           |
| `C091B7EHXNU` | `#grafana-ai-dev`                          |
| `C0AT2GH7YDU` | `#wg-assistant-workspace`                  |

Pass `oldest` as the `oldest` parameter and `latest` as the `latest` parameter (if supported). **Fetch in parallel** in a single tool batch (along with the GitHub and mentions calls below — all four sources can run concurrently). Filter ruthlessly for human signal (refer to the filtering rules below).

**Fetch threads for substantive messages.** If a top-level message looks worth surfacing (long, tagged people, opens a question), and `reply_count > 0`, call `mcp__plugin_slack_slack__slack_read_thread` with `message_ts` to get the reply chain. Include the most signal-rich replies in the bullet (don't quote every reply — distill). Many of the most useful conversations at Grafana live in threads, not top-level posts.

### 2. PRs opened in the digest window (grafana/design)

Run via Bash (substitute `$CREATED_SINCE` and `$CREATED_UNTIL` from above):

```bash
gh pr list --repo grafana/design \
  --search "created:>=${CREATED_SINCE} created:<=${CREATED_UNTIL}" \
  --state all \
  --json number,title,author,url,createdAt,state,isDraft,reviewDecision \
  --limit 30
```

Capture PR number, title, author, URL, **relative age** (compute from `createdAt`: e.g. `2h ago`, `14h ago`), and derive a **status label** from `state`, `isDraft`, and `reviewDecision`:

| Conditions                                                                           | Status label                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------- |
| `state == "MERGED"`                                                                  | `:white_check_mark: merged`                   |
| `state == "CLOSED"` (not merged)                                                     | `:no_entry: closed (not merged)`              |
| `isDraft == true`                                                                    | `:construction: draft`                        |
| `state == "OPEN"` and `reviewDecision == "APPROVED"`                                 | `:white_check_mark: approved, awaiting merge` |
| `state == "OPEN"` and `reviewDecision == "CHANGES_REQUESTED"`                        | `:speech_balloon: changes requested`          |
| `state == "OPEN"` and `reviewDecision in ("COMMENTED", "REVIEW_REQUIRED", "", null)` | `:eyes: needs review`                         |

Check the conditions in order: `MERGED` / `CLOSED` / draft are terminal; the review-decision branches only apply to open non-draft PRs.

### 3. GitHub issues opened in the digest window (grafana/design)

Run via Bash:

```bash
gh search issues --repo grafana/design \
  "created:>=${CREATED_SINCE} created:<=${CREATED_UNTIL}" \
  --json number,title,author,url,createdAt --limit 30
```

Use `gh search issues` (not `gh issue list --search`); the latter ignores `created:` filters on many repos.

Capture issue number, title, author, URL.

If `gh` fails for either of these (not authenticated, network, etc.), skip the failing section and note it in the response — do not abort the digest.

### 4. Mentions / needs response (Slack search)

Find messages in the digest window that `@mention` the user running the skill. Look up the user's `user_id` from the Slack MCP tool descriptions (`Current logged in user's user_id is U...`). Then call the search tool with the user-ID query and pass `oldest` as the `after` **parameter** (not in the query string — Slack's in-query `after:` is date-resolution only):

```
mcp__plugin_slack_slack__slack_search_public_and_private
  query: "<@USER_ID>"
  after: "<oldest-unix-seconds>"
  sort: timestamp
  sort_dir: desc
  limit: 30
```

Filter results to messages with `ts` before `latest` if the tool returns items outside the window.

Filter the results:

- Drop messages authored by the user themselves
- Drop bot mentions (subscribe notifications, GitHub bot mentions, etc.)
- Keep messages where the user is genuinely tagged and may want to respond

Capture channel, author, timestamp, permalink, and a 1-sentence excerpt.

## Summarization

After gathering all sources, produce a Slack-formatted digest. Requirements:

- **Lead with a Top Signals summary** (see Output format). 3-4 bullets of the most attention-worthy **non-PR** highlights — Slack discussions, thread decisions, blockers, cross-posted announcements, or mentions needing response. Do **not** repeat individual PR numbers or merge/review status here (those belong in the PR section). Each bullet should be one sentence so the reader gets the gist before scrolling. When a bullet is about Slack activity, end it with `<permalink|slack thread>` (parent message link for threads).
- **Group by section**, not flat
- **Skip empty sections entirely** — don't output `(no activity)` headings. If a channel has no signal, don't list it.
- **Deduplicate cross-posts.** When the same content/link appears in multiple channels (common Grafana pattern — announcements get cross-posted), collapse to one bullet that lists the channels: e.g. `*GMF launch* — cross-posted in #product-design, #ai-at-grafana`. Don't repeat the same news under each channel heading.
- **Filter team channels ruthlessly** for human signal:
  - Drop `GitHub:` PR feed messages with no human-authored text (the bot blocks-only posts) — those are captured separately
  - Drop bot subscribe/unsubscribe notifications
  - Drop `AI async update` and `Tuesday standup` style automated prompt bots
  - Drop pure chitchat ("hey", "ok", "lol", emoji-only reactions)
  - Drop welcome/joined-the-channel messages and Slackbot reminders
  - Drop messages authored by the user running the skill — they know what they posted
- **For PRs**: list each with number (linked), title, author, relative age, and the derived status label. Group thematically if useful (e.g. "Token system PRs").
- **For issues**: list each with number (linked), title, author. Group thematically if useful.
- **For mentions**: lead with the most recent. Quote a single sentence of context. Link to the message so the user can jump to it.
- **Use Slack markdown**: single `*asterisks*` for bold, `_underscores_` for italic, `` `backticks` `` for code, `<url|label>` for links. Slack does NOT use `**double asterisks**`.
- **Stays scannable in under a minute** — the whole digest should fit in roughly one screen.
- **Time window**: only summarize activity from the computed digest window. Include `label` in the subtitle.

## Output format

Sections in this order. Omit any section that has no data.

```
*PDE Daily Digest — YYYY-MM-DD*
_Since 9am yesterday (UK)_  ← use the computed `label`

---

*:dart: Top signals*
- one-sentence **non-PR** highlight (Slack thread, blocker, or cross-posted announcement) <permalink|slack thread>
- one-sentence highlight (action-required or time-sensitive) <permalink|slack thread>
- one-sentence highlight (mention needing reply, or strategic Slack signal) <permalink|slack thread>
- (3-4 bullets total — no PR numbers or merge/review status here; omit link suffix when not Slack-sourced)

---

*Team channels*

*#channel-name — short theme*
- bullet summarizing a post or thread <permalink|slack thread>
- bullet <permalink|slack thread>

*#channel-name — short theme*
- bullet

*PRs opened in window (grafana/design)*
- <pr-url|#290 PR title> — author — 2h ago — :white_check_mark: approved, awaiting merge
- <pr-url|#288 PR title> — author — 14h ago — :eyes: needs review

*GitHub issues opened in window (grafana/design)*
- <issue-url|#289 Issue title> — author

*:wave: Mentions / needs response*
- _<message-link|user, channel>_: brief excerpt
- _<message-link|user, channel>_: brief excerpt

---
_Generated on demand via /pde-digest._
```

Channels come first because conversational signal is the highest-context, lowest-elsewhere-visible information. PRs/issues are visible in GitHub notifications already. Mentions go last so they're easy to find at the bottom: the user can scroll straight to them.

## Posting

Send the digest as a DM to the user running the skill. The current Slack user's `user_id` is exposed by the Slack MCP plugin in the tool descriptions for `mcp__plugin_slack_slack__slack_send_message` and `mcp__plugin_slack_slack__slack_search_users` — look for "Current logged in user's user_id is U..." in those descriptions and use that value.

Call `mcp__plugin_slack_slack__slack_send_message` with:

- `channel_id`: the current user's own `user_id`
- `message`: the digest text

Return the message link to the user along with a brief 3–4 bullet list of the top **non-PR** signals to highlight what's worth their attention.

## Edge cases

- **Zero data from all sources**: don't send the DM. Tell the user "no meaningful activity in the digest window" and stop.
- **A Slack channel read fails** (`not_in_channel`, etc.): continue with the others and note the failed channel in the response (not the DM).
- **`gh` CLI fails**: skip the failing section (PRs or issues) and note it in the response. Continue with the rest.
- **Mentions search returns nothing**: omit the section.

## Notes

- The PDE team (Product Design Engineering) currently includes Ed Poole, Matt Adams, Ben Darlow, and Lauren Armstrong. Frame the digest in terms of what's relevant to PDE work — design tokens, component system, AI agent tooling, Agentic Experience Platform PRs, product launches that affect the workspace.
- Today's date is available via the system context. Use that for the heading.
- Some channels are private. Each user can only read channels they're a member of. If a channel returns `not_in_channel`, note it but continue with the rest.
- `gh` CLI must be authenticated against github.com. Check via `gh auth status` if PR/issue results are unexpectedly missing.
- Window logic is implemented in `tools/pde-digest/src/digest-window.ts` — same rules as the scheduled GitHub Actions digest.
