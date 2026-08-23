---
targets: [claude, codex]
description: Analyze the current diff (staged or unstaged changes) and create a changeset file.
---

Analyze the current diff (staged or unstaged changes) and create a changeset file.

Steps:

1. Run `git diff --stat HEAD` to identify which files have changed
2. Determine which workspace packages are affected by mapping changed file paths to packages in `packages/` and `apps/`
3. For each affected publishable package (skip private apps):
   - Assess the nature of the change:
     - **patch**: Bug fixes, documentation updates, refactors with no API changes
     - **minor**: New features, non-breaking API additions
     - **major**: Breaking API changes, removed exports, changed function signatures
4. Generate a `.changeset/<random-id>.md` file with the correct format:

```markdown
---
'@grafana/<package-name>': <patch|minor|major>
---

<Description of what changed and why>
```

5. If multiple packages are affected, include all of them in the frontmatter
6. Show the generated changeset for review

Only include publishable packages (those without `"private": true` in their package.json). Skip `@grafana/design-site` and other private apps.
