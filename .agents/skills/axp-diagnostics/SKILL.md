---
name: axp-diagnostics
description: Report how the Agentic Experience Platform is wired in the current repo — MCP server, agent guidance, installed package versions, per-app wiring, and the supply-chain settings that most often break a beta install. Suggests fixes but never changes the setup, and saves the report to axp-diagnostics.md for sharing.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/axp-diagnostics/SKILL.md
---

# AXP diagnostics

Report how AXP is wired in this repo, as a table, and say what to do about anything that looks wrong.

**Never change the setup you are diagnosing.** No edits to source, config, or manifests; no installs; no running a fix. Report and suggest; the user decides. That guarantee is what makes the command safe to run at any point in a session — it runs when something is already broken, and an agent that "helpfully" re-ran setup mid-diagnosis would destroy the evidence.

The one file it writes is its own report, `axp-diagnostics.md` (step 4). That is an output, not a change to the thing being measured.

**Opening note.** If the user typed a path after the command, restrict the per-app rows to that package. Otherwise cover every app you find.

## Step 1: Resolve the layout first

Every later row is either root-scoped or per-app, so establish the shape before checking anything.

- Workspace if `pnpm-workspace.yaml` has a `packages:` list, or `package.json` has a `workspaces` field. Note the globs.
- An **app** is a package with `src/plugin.json`, or a bundler config plus an app-shaped entry. The entry list is exactly `src/module.tsx`, `src/module.ts`, `src/App.tsx`, `src/App.jsx`, `src/main.tsx`, `src/main.ts` — all six. A plain `src/index.*` does **not** count, which is how libraries are kept out. Checking a shorter list skips apps the CLI wires, and a per-app row that never appears reads as nothing to report.
- Record the workspace root and each app's path relative to it.

In a flat repo the root is the app, and root-scoped and per-app rows describe the same directory.

## Step 2: Gather each row

Read what is actually on disk. Do not infer a value from another value, and report `unknown` rather than guessing.

### Root-scoped

| Row                | How                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MCP server**     | `.mcp.json` at the root has an `mcpServers.grafana-design` entry. Record the command and args — `npx -y @grafana/design-mcp@beta` is the expected shape.                 |
| **Agent guidance** | `AGENTS.md` at the root contains a block between `<!-- axp:begin -->` and `<!-- axp:end -->`.                                                                            |
| **Slash commands** | Which of `axp-send-feedback`, `axp-summarize-session`, `axp-diagnostics` exist under `.claude/commands/` and `.cursor/commands/`. A missing one means setup predates it. |
| **Project URL**    | `gh repo view --json nameWithOwner,url --jq '.url'`. If `gh` isn't authenticated or there's no remote, report `not on GitHub` rather than failing the whole run.         |

### Installed versions

Cover all twelve published AXP packages: `@grafana/ai-elements`, `@grafana/base-ui`, `@grafana/components`, `@grafana/design-catalog`, `@grafana/design-codemods`, `@grafana/design-mcp`, `@grafana/design-setup`, `@grafana/design-tokens`, `@grafana/eslint-plugin-design`, `@grafana/fonts`, `@grafana/icons`, `@grafana/theme-providers`.

Report the **installed** version, not the range in `package.json`. A range says what was asked for; the installed version says what was resolved, and the gap between those is where most of the surprises live.

**Ask the package manager — do not guess at paths.** Under pnpm, a root `node_modules/<pkg>/package.json` miss proves nothing: only direct root dependencies are linked there. A transitive package such as `@grafana/design-catalog` lives under `node_modules/.pnpm/@grafana+<pkg>@<version>/node_modules/@grafana/<pkg>/`, and in a workspace an app's runtime deps live in that app's own `node_modules`, not the root's. Reading the root path alone reports a healthy monorepo as half-uninstalled.

```bash
pnpm ls -r --depth Infinity --json @grafana/<pkg>   # workspace-wide, all depths
npm ls @grafana/<pkg> --json                        # npm
yarn why @grafana/<pkg>                             # yarn
```

Only conclude `not installed` when the package manager reports nothing anywhere in the workspace. If none of the above is available, search `node_modules/.pnpm/` for `@grafana+<pkg>@*` before deciding, and say in the detail column how you resolved it.

**Absence is only a fault for the packages a normal setup actually installs.** Four of the twelve are expected to be missing from a perfectly healthy repo, so a `✗` on those is noise and the remediation line under it is worse than useless:

| Package                                                                                                      | Absent means                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@grafana/base-ui`, `@grafana/design-tokens`, `@grafana/theme-providers`, `@grafana/icons`, `@grafana/fonts` | `✗` — these are the core runtime deps every app gets                                                                                                                                                                     |
| `@grafana/design-mcp`                                                                                        | `✗` — the CLI adds it as a root devDependency, so its absence means that step did not land. Judge it on its own: it does **not** make the MCP server row fail, because `.mcp.json` runs `npx` and needs no local install |
| `@grafana/design-catalog`                                                                                    | `—` — it arrives transitively with design-mcp, but the slash commands do **not** read this copy (see below)                                                                                                              |
| `@grafana/ai-elements`                                                                                       | `✗` **only if** the app's source imports it while it is absent; otherwise `—`. `--no-ai-elements` is a supported choice that leaves no trace on disk, so absence by itself is not a fault                                |
| `@grafana/components`                                                                                        | `✗` **only if** the app's source imports it while it is absent; otherwise `—`. `--with-components` is opt-in and leaves no trace on disk, so absence by itself is not a fault                                            |
| `@grafana/design-setup`                                                                                      | `—` always. It runs via `npx` and is never a dependency                                                                                                                                                                  |
| `@grafana/design-codemods`                                                                                   | `—` always. The bundled skills moved to `@grafana/design-catalog`, so design-mcp no longer pulls the codemod toolchain in                                                                                                |
| `@grafana/eslint-plugin-design`                                                                              | `—` unless the repo wired the lint rules itself; the CLI does not install it                                                                                                                                             |

`@grafana/theme-providers` deserves particular attention: it backs the providers the per-app rows check, so a missing or stale copy there explains a provider failure that otherwise looks like a wiring bug.

**Never infer a fault from a CLI flag you cannot see.** `--with-components` and `--no-ai-elements` are supported choices, and neither is recorded anywhere on disk. When a package's status depends on which flags were used, decide from evidence you can actually read — whether the app's own source imports the package. Absent **and** unused is a `—`; absent **and** imported is a real `✗`, and a build failure waiting to happen. Guessing the flag instead produces a failing row telling a tester to install something they deliberately skipped.

**The consumer's `@grafana/design-catalog` copy does not serve the slash commands.** When `.mcp.json` runs `npx -y @grafana/design-mcp@beta`, npx fetches its own tree and the skills are read from _that_ copy — the version installed in the consumer is incidental. So never explain a failing `/axp-…` command by pointing at the consumer's catalog version. If a command reports a skill it cannot find, the cause is the version npx resolved for design-mcp, and the fix is to restart the agent so npx re-resolves.

### Version freshness

Compare each installed package against **the dist-tag that package is pinned to**, which is not the same tag for every one of them. Read the tag from the range in the consumer's `package.json` (`beta`, `latest`, or an exact pin), then ask npm what that tag currently points at:

```bash
npm view @grafana/<pkg>@<tag> version
```

Two cases where assuming `beta` gives a wrong answer:

- **`@grafana/fonts` publishes only `latest`** — it has no `beta` tag at all, so `@beta` returns nothing. Query `@grafana/fonts@latest`, and never report the empty result as "behind".
- **An exact pin** (no tag) is not stale by definition. Report the pin and move on; a pinned version behind the tag is a deliberate choice, not a fault.

Flag anything genuinely behind its own tag. Two causes, both worth naming in the fix line because the remedy differs:

- `pnpm dlx` caches a resolved version for 24 hours, so a CLI fetched that way can be stale even when the tag has moved.
- A `minimumReleaseAge` quarantine (see below) holds back recent publishes and resolves an older version **silently**.

If the registry cannot be reached, report the freshness rows as `?` and keep going. Every other check is local and still worth reporting.

### Supply-chain and toolchain

| Row                            | How                                                                         | Why it matters                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package manager**            | `pnpm --version` (or npm/yarn), plus the `packageManager` field             | pnpm **below 11.20** ignores `trustPolicyExclude` for newly-resolved transitive dependencies, so an exclusion that looks correct has no effect |
| **Node**                       | `node --version` against the repo's `engines` / `.nvmrc`                    | an exact-pin mismatch surfaces as an install warning that is easy to miss                                                                      |
| **`minimumReleaseAge`**        | `pnpm-workspace.yaml`, or `minimum-release-age` in `.npmrc`                 | quarantines recent publishes; a fresh beta resolves to an older build with no warning                                                          |
| **`minimumReleaseAgeExclude`** | **`pnpm-workspace.yaml` only** — never `.npmrc`, whichever file set the age | without the AXP packages listed the quarantine applies to them too                                                                             |
| **`trustPolicy`**              | `pnpm-workspace.yaml`                                                       | `no-downgrade` rejects a version whose provenance regressed by publish date, which fires on legitimate CVE backports                           |
| **`trustPolicyExclude`**       | same file                                                                   | the escape hatch for those false positives                                                                                                     |

Report the settings even when nothing is wrong — knowing a repo has no quarantine is as useful as knowing it has one.

**The two settings do not live in the same file.** `minimumReleaseAge` may be set in either place — as `minimumReleaseAge` in `pnpm-workspace.yaml`, or as kebab-case `minimum-release-age` in `.npmrc` — but the exclusion is only ever read from and written to `pnpm-workspace.yaml`. So looking for the exclude list "next to" the age setting misses a perfectly good list whenever the age came from `.npmrc`. A repo in that state — age in `.npmrc`, no `pnpm-workspace.yaml` at all — is a genuine finding worth its own line: the CLI cannot write the exemption anywhere pnpm will read it.

### Per-app wiring

For each app, from the app's own directory:

| Row              | How                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime deps** | which AXP runtime packages appear in that app's `package.json`                                                                                                                                        |
| **Providers**    | does the App component (`src/app/App.tsx`, `src/components/App/App.tsx`, `src/App.tsx`) wrap its root JSX in the providers — see the accepted shapes below                                            |
| **CSS imports**  | does the entry the CLI actually writes to import the tokens CSS and the fonts — check the right file, and match the two differently; see below                                                        |
| **Bundler**      | does the webpack config set CSS `sideEffects` and font `[hash][ext]`; if `docs/axp-webpack-notes.md` or `docs/axp-vite-notes.md` exists, the CLI could not patch and the snippets still need applying |

Providers written but not wrapped around the root is the failure worth catching here: the package is installed, the file exists, and nothing is in the tree.

**Check the entry the CLI wrote to, not the one you would have picked.** The CSS step takes the **first** file that exists from this list, in exactly this order, and writes the imports only into that one:

```
src/module.tsx  src/module.ts  src/App.tsx  src/App.jsx  src/main.tsx  src/main.ts  src/index.tsx  src/index.ts
```

The order is the trap. `src/App.tsx` comes **before** `src/main.tsx`, so a typical Vite app with both has its imports in `App.tsx` while `main.tsx` looks bare — read `main.tsx` and you report a false `✗`, with a fix line for wiring that is already in place. Resolve the first existing entry in that order, then check that file and name it in the detail column.

This list is **not** the same as the app-detection list in step 1: it has eight entries rather than six, because `src/index.tsx` and `src/index.ts` are fine as a place to put an import even though they never make a package count as an app.

**Accepted CSS imports.** Tokens and fonts are not matched the same way, and matching both strictly produces false failures:

- **Tokens** — require `@grafana/design-tokens/tokens.css` exactly. Only that subpath registers the custom properties, so nothing else counts.
- **Fonts** — accept **any** import from `@grafana/fonts`, in either quote style. The bare entry `import '@grafana/fonts';` is what the package's own README documents, and the package exports both `.` and `./fonts.css`. The CLI takes the same view and leaves such an app alone, so demanding `@grafana/fonts/fonts.css` would report a correctly wired app as broken and attach a fix line to it.

**Accepted provider shapes.** Two providers cover two separate concerns — a portal root and a color mode — and a healthy app root has both. Any of these passes:

- `PortalProvider` + `ColorMode` — a Grafana plugin, which feeds `ColorMode` the host's `useTheme2` and `getAppEvents`
- `PortalProvider` + `ColorModeProvider` — a standalone Vite host, which has no Grafana theme bus
- **`ThemeProviders`** — an older wrapper that contains the pair. `design-setup` still counts this as wired and leaves it alone, so consumers set up before the CLI switched to inlining the providers legitimately still have it. Treat it as a pass, not a failure.

Only report `✗` when the root is wrapped in **none** of these. A portal provider with no color mode (or the reverse) is a partial pass worth calling out in the detail column, since tokens and floating UI fail independently of one another.

## Step 3: Report

One table, ordered root-scoped → versions → supply-chain → per-app. Use `✓` for healthy, `✗` for a problem, `—` for not applicable, `?` for could not determine.

```markdown
## AXP diagnostics

**Layout:** workspace at `<root>`; apps: `<paths>` (or: flat repo)
**Project:** <url or "not on GitHub">

| Check                    | Status | Detail                              |
| ------------------------ | ------ | ----------------------------------- |
| design-mcp in .mcp.json  | ✓      | `npx -y @grafana/design-mcp@beta`   |
| AGENTS.md guidance block | ✗      | no `<!-- axp:begin -->` block found |
| …                        |        |                                     |
```

Then, **only for rows that are `✗` or `?`**, a short remediation list — the specific command or edit, one line each:

```markdown
### Suggested fixes

- **AGENTS.md guidance block** — re-run `npx -y @grafana/design-setup@beta`; it appends the block without touching the rest of the file.
- **@grafana/base-ui is 5 days behind `beta`** — `minimumReleaseAge: 4320` is quarantining it. Add the AXP packages to `minimumReleaseAgeExclude`, or install with `pnpm --config.minimumReleaseAge=0 install`.
```

Say nothing for healthy rows. A clean run should end at the table.

## Step 4: Save the report so it can be shared

Write the same report to **`axp-diagnostics.md`** so the user can attach it to an issue or paste it into a thread without re-running anything.

- **Where.** The root of the repo the command ran in — the workspace root in a monorepo. If the user scoped the run to one app by passing a path, write it in that app's directory instead, next to the thing it describes.
- **What.** A stamp line, then the report exactly as shown on screen — same heading, layout line, table, and suggested-fixes list, unaltered. The stamp is the one thing the file adds, and it goes **above** the report rather than changing it:

  ```markdown
  _Generated by `/axp-diagnostics` on <YYYY-MM-DD> for `<repo>`._

  ## AXP diagnostics
  ```

  Below that line the file and the on-screen report must match. A saved report whose contents differ from the one the user saw is worse than none — the stamp exists so a report pasted into an issue next week is not mistaken for a current one, not to restate or summarize the findings.

- **Overwrite** any existing `axp-diagnostics.md` without asking. It is a snapshot, not a log, and the freshest one is the only useful one.
- **Say where it went**, as the last line of your reply: `Saved to axp-diagnostics.md — attach this to an issue or paste it into a thread.` Do not make the user ask where the file is.

This report is the one file the command writes, and it never touches the setup it is describing. If the write fails — a read-only checkout, a permissions error — report the failure in one line and keep the on-screen table. The table is the deliverable; the file is a convenience.

Mention the file in `.gitignore` terms only if the user asks. Whether a diagnostics snapshot belongs in their repo is their call, not yours.

## Rules

- **Never change the setup you are diagnosing.** No edits to source, config, or manifests; no installs; no running a fix. Suggest the command and let the user run it. The single exception is `axp-diagnostics.md`, the report itself.
- Report `?` when a check cannot be completed, and say why in the detail column. A confident wrong answer is worse than an admitted gap.
- Resolve installed versions through the package manager, never from a `package.json` range and never from a guessed `node_modules` path.
- Do not infer wiring from a package being installed. Check the file.
- Absence is not always a fault. Check a missing package against the table in **Installed versions** before flagging it, and remember a repo with no `minimumReleaseAge` needs no exclusions. Mark those `—`, not `✗`.
- Accept every provider shape the CLI accepts, `ThemeProviders` included. Reporting a correctly wrapped app as broken sends the tester to fix something that already works.
- If nothing is wrong, say so plainly and stop. Do not manufacture advice.
