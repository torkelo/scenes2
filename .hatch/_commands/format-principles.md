---
targets: [claude, codex]
description: Transform JSON principles into three AI-optimized formats (Cursor .mdc, Claude Code .md, and display markdown)
---

You are a technical writer transforming design principles into concise, actionable rules optimized for LLM context windows.

## Input

Read the principles from: `src/data/principles.json` (or path specified by user)

## Output: generate three files

### 1. public/GUIDELINES.mdc (Cursor rule format)

File with YAML frontmatter for Cursor IDE:

```yaml
---
description: Grafana design principles for building accessible, performant interfaces with consistent patterns
alwaysApply: true
---
[Markdown content following format below]
```

### 2. public/GUIDELINES.md (Claude Code format)

Plain markdown file (no frontmatter) that users can:

- Download and @-mention in Claude Code conversations
- Copy to their project's `.claude/` directory
- Paste directly into LLM conversations

Use the same markdown format as below.

### 3. PRINCIPLES.md (display format)

Root-level file for reference and clipboard copying via the website.

## Markdown format for all three files

```markdown
Concise rules for [domain] Use MUST/SHOULD/NEVER to guide decisions

## [Section Name]

- MUST: [Specific, actionable requirement] [Additional context or example]
- SHOULD: [Recommended practice] [Reasoning]
- NEVER: [Forbidden action]
- MUST: [Another requirement]
```

IMPORTANT: Flat list structure only. Every bullet starts with MUST/SHOULD/NEVER. No nested bullets or grouping labels.

## Transformation rules

1. **Structure**: Flatten all principles into MUST/SHOULD/NEVER bullets
   - JSON `section.title` → `## Section Title` (h2 heading)
   - JSON `principle.content` → Extract into flat MUST/SHOULD/NEVER bullets
   - Every bullet MUST start with MUST/SHOULD/NEVER (no nested bullets, no grouping labels)
   - Preserve order from JSON

2. **Opening line**: "Concise rules for building Grafana interfaces Use MUST/SHOULD/NEVER to guide decisions"

3. **Directive levels**:
   - MUST: Hard requirements, non-negotiable rules
   - SHOULD: Strong recommendations, best practices
   - NEVER: Explicit prohibitions

4. **Style requirements**:
   - Short, specific sentences (prefer <20 words)
   - Lead with the directive, follow with context
   - Include concrete examples: values, code snippets, patterns
   - Use inline code for technical terms: `theme.spacing()`, `<button>`, `16px`
   - Use semicolons to chain related clauses

5. **Transform principle.content**:
   - Split content into logical MUST/SHOULD/NEVER statements
   - Extract all concrete details (numbers, code, examples)
   - Preserve all technical information from the original content

6. **Example transformation**:

   **JSON**:

   ```json
   {
     "title": "Theme & Design Tokens",
     "principles": [
       {
         "title": "Always use theme tokens",
         "content": "Never hardcode colors, spacing, typography, borders, or shadows. Access via `useTheme2()` or `useStyles2()`."
       }
     ]
   }
   ```

   **Output**:

   ```markdown
   ## Theme & Design Tokens

   - Always use theme tokens
     - NEVER: Hardcode colors, spacing, typography, borders, or shadows
     - MUST: Access via `useTheme2()` or `useStyles2()`
   ```

7. **Key principle**: Straightforward translation. No reorganization. No new groupings. Just convert the content.

## Process

1. Read the JSON file: `src/data/principles.json`
2. For each section in the JSON:
   - Create an `## [Section Title]` heading
   - For each principle in that section:
     - Extract the principle.content
     - Split into individual MUST/SHOULD/NEVER statements
     - Create flat bullets (no nesting): `- MUST: rule here`
     - Preserve all concrete details (code, numbers, examples)
3. Generate the markdown content following the JSON section order
4. Write three files:
   - `public/GUIDELINES.mdc` with YAML frontmatter
   - `public/GUIDELINES.md` without frontmatter
   - `PRINCIPLES.md` without frontmatter
5. Confirm all files created

## Notes

- Optimize for token efficiency; every word must add value
- The output will be loaded into LLM context windows as guidance
- Maintain technical accuracy while being concise
- Preserve all important details, links, and examples from the original principles
- All three files have identical content except GUIDELINES.mdc has YAML frontmatter

Begin by reading the JSON file and transforming it into all three formats.
