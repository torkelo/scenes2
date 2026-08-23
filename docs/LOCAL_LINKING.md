# Local linking (pre-publish testing)

Use `link-workspace` to try out unpublished changes from this workspace inside
a consumer application without publishing to npm. Point the consumer at the
local source directories:

```bash
pnpm link-workspace <path-to-consumer-repo>
```

`link-workspace` discovers every publishable workspace package, builds them
once, and rewrites the consumer's configuration so any direct or transitive
install of those packages resolves to a symlink into this repo. It
auto-detects the consumer's package manager and whether it's a workspace,
and picks the right destination file, field, and specifier:

| Consumer PM         | Overrides destination                 | Live-mode specifier | Direct-dep handling                    |
| ------------------- | ------------------------------------- | ------------------- | -------------------------------------- |
| `pnpm` (workspace)  | `overrides:` in `pnpm-workspace.yaml` | `link:`             | Override only — direct deps untouched. |
| `pnpm` (single pkg) | `pnpm.overrides` in `package.json`    | `link:`             | Override only.                         |
| `yarn` v2+ (berry)  | `resolutions` in `package.json`       | `portal:`           | Override only.                         |
| `npm`               | `overrides` in `package.json`         | `file:` (dir path)  | Hybrid — see below.                    |
| `bun`               | `overrides` in `package.json`         | `file:` (dir path)  | Hybrid — see below.                    |
| `yarn` v1 (classic) | `resolutions` in `package.json`       | n/a — frozen-only   | Override only.                         |

The result is a real symlink in `node_modules/@grafana/<name>` pointing at
`packages/<name>/`. Source edits propagate as soon as the package's `dist/`
is rebuilt. Run a watch-mode build in this workspace alongside the consumer
to keep `dist/` fresh:

```bash
pnpm turbo run dev
```

**pnpm-workspace.yaml destination.** pnpm 10+ moved workspace overrides
out of `package.json` `pnpm.overrides` and into `pnpm-workspace.yaml`'s
`overrides:` mapping. When the consumer has that file, `link-workspace`
writes its entries between sentinel comments
(`# --- @grafana/design link-workspace start/end ---`) inside the
existing `overrides:` block, preserving the consumer's existing
overrides and comments verbatim. `unlink-workspace` finds the same
sentinels and removes only what's between them.

**Hybrid strategy (`npm` / `bun`).** Both reject overrides whose spec
differs from a direct dependency (`EOVERRIDE`), so for these managers
`link-workspace` also rewrites any matching direct dep (across every
workspace `package.json`, not just the root) to the live specifier. The
original specs are saved to `.workspace-link-backup.json` alongside the
consumer's root `package.json` so `unlink-workspace` can restore them
byte-for-byte.

**Dogfooding a brand-new package (`--target <sub-pkg>`).** Overrides only
redirect deps that already exist somewhere in the graph; they don't add
new ones. When you want to start using a workspace package the consumer
doesn't yet list as a dep, pass `--target <sub-pkg>` (a path such as
`apps/<sub-app>` or a package name such as `@your-scope/<package>`). The
linker adds each workspace package as a `dependencies: "*"` entry in
that sub-package's `package.json`; the override redirects the
resolution. `unlink-workspace` removes those additions on the way out.

**Frozen mode (`--frozen`).** Skips symlinking and instead builds,
`pnpm pack`s, and links to the resulting tarballs. Use when you want a
snapshot that won't follow source changes. Yarn v1 is forced into this
mode automatically: its `resolutions` field copies on `file:` rather
than symlinking and has no `portal:`/`link:` equivalent.

Disconnect when finished:

```bash
pnpm unlink-workspace <path-to-consumer-repo>
```

`unlink-workspace` reads `.workspace-link-backup.json`, removes whatever
the linker wrote (sentinel block in YAML, override entries in JSON,
direct-dep rewrites across the workspace, `--target` additions), deletes
the backup file, and re-runs the consumer's install command. The
consumer ends up byte-equivalent to its pre-link state.

The link/unlink pair is the canonical way to dogfood unpublished work. Use
it ahead of every release that lands a behavior change consumers will
notice.
