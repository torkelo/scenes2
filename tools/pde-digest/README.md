# @grafana/pde-digest

A daily Slack digest for the Product Design Engineering team. Reads recent activity from 9 PDE / product-design / AI channels (including thread replies), `grafana/design` PRs and issues opened in the window, and @mentions of configured PDE team members. Summarizes with Claude and posts to `#team-product-design-engineering-private`.

Runs on GitHub Actions on a schedule (and on demand via the **Run workflow** button), independent of any individual's laptop.

## How it works

1. A GitHub Actions cron fires once a day (Mon–Fri, 08:00 UTC by default).
2. The workflow installs deps and runs `pnpm --filter @grafana/pde-digest run digest`.
3. The script reads messages from each channel in `config.json` for a **contiguous 9am–9am UK window** (Europe/London), aligned with the ~9am post time. Tue–Fri runs cover the previous 24 hours; Monday run covers Fri 9am → Mon 9am (weekend included). It fetches thread replies when the parent message has `reply_count > 0` and looks substantive (≥60 characters, contains `?`, or @mentions someone).
4. In parallel, it lists PRs and issues opened in the same window from `grafana/design` (via `gh` + `GITHUB_TOKEN` in CI).
5. It scans channel activity for @mentions of PDE team members listed in `mentionUserIds`.
6. It sends the combined raw activity to the Anthropic API and asks Claude to produce a scannable digest with **Top signals** (non-PR highlights only), **Team channels**, **PRs**, **Issues**, and **Mentions / needs response**.
7. It posts the digest to the channel ID in `DIGEST_CHANNEL_ID`. Skips posting if all sources are empty.

## Setup

### Slack app

The bot is defined by [`slack-app-manifest.yaml`](./slack-app-manifest.yaml). To recreate or audit the app:

1. <https://api.slack.com/apps> → existing PDE Digest app (or create from manifest)
2. **OAuth & Permissions** → install / reinstall to the Grafana workspace
3. **Invite the bot** to each channel in `config.json`:
   ```
   /invite @PDE Digest
   ```
   Without this, the channel will fail with `not_in_channel` and be skipped.
4. Copy the **Bot User OAuth Token** (`xoxb-...`); this is `SLACK_BOT_TOKEN`.

### Anthropic API key

Create one at <https://console.anthropic.com/> → **API Keys**. Daily digest cost is under $0.10.

### Secrets (Vault) and variables

The two secrets live in the Grafana Vault instance, not in GitHub repo secrets. The workflow exchanges its GitHub OIDC token for a Vault token via [`grafana/shared-workflows/actions/get-vault-secrets`](https://github.com/grafana/shared-workflows/tree/main/actions/get-vault-secrets) and reads them at runtime.

Store both fields under the team-owned path `ci/repo/grafana/design/pde-digest`:

| Vault field         | Value         |
| ------------------- | ------------- |
| `slack-bot-token`   | `xoxb-...`    |
| `anthropic-api-key` | Anthropic key |

The workflow reads from the prod (`ops`) Vault instance, so writing the secret needs a `vault-shell` session from a [`grafana/deployment_tools`](https://github.com/grafana/deployment_tools) checkout (Docker running) and [OPS timed access](https://timed-access.grafana-ops.net/timed-access/access/request):

```bash
# From the deployment_tools checkout. Opens a localhost:8250 URL — log in via Okta.
VAULT_INSTANCE=prod ./scripts/vault/vault-shell
```

Then, inside the shell, write the secret **on a single line** — the Vault CLI misparses `\` line continuations:

```bash
vault kv put ci/repo/grafana/design/pde-digest slack-bot-token=xoxb-... anthropic-api-key=sk-ant-...
```

Read access to `ci/repo/grafana/design/*` is granted to the repo's CI workflows automatically via the GitHub OIDC binding — no manual policy request needed. Engineers can write and list these paths but cannot read them back (a `403` on `vault kv get` is expected). Verify the write landed with:

```bash
vault kv list ci/repo/grafana/design/
```

The non-secret channel ID stays a GitHub repository variable. In `grafana/design` repo settings → **Secrets and variables → Actions**:

| Name                | Type                | Value                                                      |
| ------------------- | ------------------- | ---------------------------------------------------------- |
| `DIGEST_CHANNEL_ID` | Repository variable | `C09N762DJUE` (`#team-product-design-engineering-private`) |

## On-demand alternative

For a personalized digest you can trigger yourself in Claude Code (different channels / filtering), use the `/pde-digest` skill at [`skills/pde-digest/SKILL.md`](./skills/pde-digest/SKILL.md). Each person installs it locally to `~/.claude/skills/pde-digest/SKILL.md`:

```bash
mkdir -p ~/.claude/skills/pde-digest
curl -fsSL https://raw.githubusercontent.com/grafana/design/main/tools/pde-digest/skills/pde-digest/SKILL.md \
  -o ~/.claude/skills/pde-digest/SKILL.md
```

Then `/reload-plugins` (or start a new Claude Code session) and type `/pde-digest`.

The skill uses each person's own Slack OAuth via the Claude Code Slack plugin, so it reads only the channels they're a member of. It uses the **same 9am UK digest window** as this workflow (via `pnpm --filter @grafana/pde-digest run window`).

## Configuration

`config.json`:

- `channels` — array of `{ id, name }`. The bot must be invited to each.
- `model` — Anthropic model ID. Default `claude-opus-4-8`.
- `githubRepo` — repo for PR/issue queries. Default `grafana/design`.
- `mentionUserIds` — Slack user IDs (`U…`) for PDE team members to watch for @mentions. Empty array disables the mentions section until populated. Update when team membership changes.

**Time window** (computed automatically, not configurable):

| Run day (UK, ~9am post) | Summarizes                                 | Label                    |
| ----------------------- | ------------------------------------------ | ------------------------ |
| Monday                  | Fri 9am – Mon 9am UK (includes weekend)    | Since 9am Fri (UK)       |
| Tue–Fri                 | Previous 24h: yesterday 9am – today 9am UK | Since 9am yesterday (UK) |

Windows abut with no gaps between weekday runs. US evening activity (until ~11pm West / ~2am East) is included. The window end matches the post time, so nothing from the same morning is deferred to the next digest.

`.github/workflows/pde-digest.yml`:

- `cron` — `0 8 * * 1-5` (08:00 UTC, Mon–Fri). Targets ~9:00am+ UK delivery in BST so the digest window ends on the correct day. Flip to `0 9 * * 1-5` when UK is on GMT (winter). GitHub cron is UTC-only and DST-unaware.

## Local development

```bash
nvm use    # or install Node 24+
pnpm install

export SLACK_BOT_TOKEN=xoxb-...
export ANTHROPIC_API_KEY=sk-ant-...
export DIGEST_CHANNEL_ID=C09N762DJUE
export GITHUB_TOKEN=ghp_...   # optional locally; set automatically in CI

pnpm --filter @grafana/pde-digest run digest
```

## Troubleshooting

**`not_in_channel`**
The bot isn't a member of that channel. Run `/invite @PDE Digest` in the channel.

**`channel_not_found`**
The channel ID is wrong, or it's a private channel the bot hasn't been added to.

**`missing_scope`**
The bot is missing an OAuth scope. Compare the installed app against [`slack-app-manifest.yaml`](./slack-app-manifest.yaml) and reinstall if needed.

**`not_allowed_token_type`**
You're using a user token (`xoxp-`) instead of a bot token (`xoxb-`). Use the **Bot User OAuth Token** from OAuth & Permissions.

**The summary is hallucinating links or facts**
The prompt instructs the model to use only the raw activity provided. Open an issue with the raw activity (from the run log) and the summary output.
