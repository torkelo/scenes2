---
name: add-icon-tags
description: Add searchable tags to an icon in the @grafana/icons tags.json file.
metadata:
  generated: hatch@v1.2.0
  source: .hatch/_skills/add-icon-tags/SKILL.md
---

# Add icon tags

Run the `tag-icon` script in the icons package, passing through all arguments:

```
pnpm --filter @grafana/icons tag-icon $ARGUMENTS
```

The script accepts either the icon's PascalCase component name (e.g.
`BarAlignmentCenter`) or its kebab-case filename (e.g. `bar-alignment-center.svg`),
normalizes to kebab-case, and merges the new tags into
`packages/icons/src/icons/tags.json`. It deduplicates existing tags, then
alphabetizes and prettier-formats the file on write.
