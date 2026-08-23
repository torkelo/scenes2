# Written Style Guide

How we write prose in this monorepo — for both the people who read it and the agents who generate it.

This guide adapts the [GOV.UK content guidance](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/tone-of-voice/) and the [Home Office readability guidance](https://design.homeoffice.gov.uk/accessibility/written-content/readability) to a developer and designer audience, and borrows the UI-writing, placeholder, and product-naming conventions from [Grafana's own docs style guide](https://github.com/grafana/docs-ai/blob/main/skills/shared/style-guide.md). It follows its own advice, so treat it as a working example of the style it asks for.

## Who and what this covers

It applies to every piece of human-readable prose produced here:

- Documentation — `README.md`, `docs/*.md`, package `AGENTS.md` files, MDX in the design site
- Pull request titles and descriptions, commit messages, and changesets
- Code comments, JSDoc, and component prop descriptions
- **Agent guidance itself** — `AGENTS.md`, `CLAUDE.md`, skill instructions, and any prose
  that tells an agent what to do

The last point matters. When you write instructions for an agent, the same rules apply: clear, front-loaded, and concrete. Vague guidance produces vague work.

It does **not** govern code identifiers or token names. Spelling for those lives in the [Spelling section of `AGENTS.md`](../AGENTS.md) — US English everywhere.

## Core principles

> Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences, for the same reason that a drawing should have no unnecessary lines and a machine no unnecessary parts. This requires not that the writer make all sentences short or avoid all detail and treat subjects only in outline, but that every word tell.
>
> — William Strunk Jr., _The Elements of Style_ (1918)

Strunk's test — does every word tell? — sits behind every rule below. Note what he is _not_ saying: conciseness is not the same as brevity. The goal is not to make every sentence short or to strip out detail, but to cut any word, sentence, or section that doesn't earn its place. Keep the detail a reader needs; remove the rest. In practice: write the full thought, then delete what carries no weight. This applies as much to agent guidance as to prose — a padded instruction file is as much a failure as a padded paragraph.

### Write only what the reader needs

Identify the need before you write, then publish what meets it and nothing more. A reader should be able to find what they need, do the thing, and move on without having to think too hard.

- Cut sentences that don't change what the reader knows or does.
- Don't announce a point before making it. A sentence that only sets up its neighbor ("Prose here works differently", "There are several factors") restates what the surrounding sentences already carry; delete it and keep the specifics.
- Don't detail what you're ruling out. Once you've said why something doesn't apply ("it serves a different reader"), its feature list is noise; spend the detail on what does apply.
- Don't restate the heading in the first sentence, or the summary in the opening paragraph.
- Don't pad a PR description with checkboxes for things CI already runs.

### Make each page stand alone

Readers arrive from search, a Slack link, or an agent's context window — not from a parent page. Every doc, skill, and `AGENTS.md` section should make sense on its own: name its subject, link to what it builds on, and never assume the reader has just read a sibling page. (This is the "Every Page is Page One" principle from the Grafana docs style guide, and it pairs with agent-style's curse-of-knowledge rule.)

### Front-load everything

Put the most important information first, then taper to detail — the inverted pyramid. People skim; they read roughly a quarter of a page and scan in an F-shaped pattern. The first sentence of a section, the first word of a heading, and the first item in a list carry the most weight.

### Use plain language

Plain English is not dumbing down. Readers with high literacy and deep expertise prefer it too, because it is faster to read. Plain language is the default even for specialist content.

- Prefer the short, common word: **use** not _utilize_, **buy** not _purchase_, **help** not _assist_, **about** not _approximately_, **start** not _commence_.
- Cut buzzwords and filler: _leverage_, _seamless_, _robust_, _delve_, _in order to_, _it's worth noting that_.
- Watch nouns ending in **-ion** and **-ment** — they usually hide a stronger verb (_make a decision_ → **decide**, _provide assistance_ → **help**).
- Avoid idioms and figures of speech. They don't translate and they age badly.

### Write in the active voice and address the reader

Say who does what. "Run the build" beats "the build should be run." Address the reader directly as **you** where it reads naturally, and use **they/them** as the singular gender-neutral pronoun rather than "he or she." Stay in the present simple tense: "the build fails", not "the build will fail".

### Get the tone right

Be clear, concise, and brisk without being abrupt. Be human, not a faceless machine — but stay precise; over-friendliness leads to waffle. Be serious without being pompous.

- Drop needless courtesy. You rarely need "please" or "please note" before an instruction.
- Don't use block capitals for emphasis or for runs of text. It's hard to read and reads as shouting.
- State outcomes plainly. If a step failed, say so; if something is done and verified, say that without hedging.

### Lead with the correct choice

State a rule as what to do, not what to avoid. Naming the wrong option plants it: an agent reading "don't use `neutral`" is now more likely to reach for `neutral`, not less, because the token is what sits in its context. Put the right choice in the stress position and name an alternative only when a reader would otherwise reach for it — and even then, lead with the correct one ("greys come from `neutralGray`" before, if needed, "not the raw `neutral` ramp").

## Concrete rules

### Sentences and paragraphs

- Keep sentences under about 25 words. Split long ones.
- Keep paragraphs to a handful of sentences — one idea each.
- One sentence can be a paragraph. White space helps scanning.

### Jargon, technical terms, and acronyms

Technical terms are part of the job here — don't strip them out, but use them deliberately.

- Define a specialist term the first time it appears, unless the audience plainly knows it.
- Spell out an unfamiliar acronym on first use: "Model Context Protocol (MCP)". Skip the expansion only for terms the reader certainly knows (HTML, CSS, API, URL).
- Don't invent acronyms to save a few characters. A clear phrase beats a private abbreviation.

### Requirement words: must, should, can

Use these consistently, especially in agent guidance, so the strength of an instruction is unambiguous:

- **must** / **must not** — a hard requirement; breaking it breaks the build, the release, or a convention reviewers will reject.
- **should** / **avoid** — the strong default; deviate only with a deliberate reason.
- **can** / **may** — genuinely optional.

### Headings

- Use sentence case for titles, headings, and UI text — capitalize the first word and proper nouns only.
- Make them descriptive and front-loaded. "Publishing a package" beats "Introduction".
- Prefer active verbs: "Create a changeset", not "Changesets can be created".
- Don't phrase headings as questions, and don't bury an unexplained acronym in them.
- A reader should be able to grasp the page from the headings alone.

### Lists and steps

- Use a bulleted list when order doesn't matter, and a numbered list for steps that run in sequence.
- Front-load each item and keep the items parallel in grammar.
- Don't nest deeply or split a single thought across bullets — a list of fragments is harder to read than a sentence.

### Links

- Use descriptive link text that front-loads the destination. Never "click here", "here", or "more".
- Introduce links with "refer to", not "see" — matching the Grafana Writers' Toolkit.
- The text should make sense out of context, the way a screen reader announces links in a list.
- Link to the specific page, not a homepage, and put the link where the reader needs it rather than in a "Further reading" dump.

### Writing about the UI

- Bold UI text: select **Save dashboard**.
- Reference the visible label, not the element type: "select **Save dashboard**", not "click the save button".
- UI text itself follows the same rules as headings — sentence case, front-loaded, no needless words.

### Code samples and placeholders

- Use `<VARIABLE_NAME>` for placeholders in code blocks, and _VARIABLE_NAME_ in the surrounding prose.
- Keep a command and its output in separate code blocks, so the reader can copy the command cleanly.

### Naming Grafana products

- Use the long product name on first mention ("Grafana Loki"), then the short name in the rest of the body ("Loki").
- Always "Grafana Cloud", never "Cloud" alone.
- For this project's own name, follow the nomenclature rule in [`AGENTS.md`](../AGENTS.md): Agentic Experience Platform, or AXP after first use.

### Contractions

Use ordinary contractions — "you'll", "don't", "it's". They read naturally for a technical audience. (This is a deliberate departure from GOV.UK, which avoids negative contractions for a wider-literacy public audience; that constraint doesn't fit our readers.)

### Inclusive language

Write so that it's clear, accurate, and respectful.

- Mention age, sex, gender, ethnicity, or disability only when it's relevant.
- Use person-centered wording and gender-neutral pronouns; avoid stereotypes.
- Don't use lumping acronyms like "BAME".

## Technical reference docs

How to author token, surface, elevation, and styling reference pages under `docs/` (and package docs that agents also fetch via design-mcp). The same page must work for humans and agents — don't write a separate "agent dialect." Exemplars: [`docs/design/surfaces.md`](design/surfaces.md), [`docs/control-surfaces.md`](control-surfaces.md), [`docs/elevation-borders-and-overlays.md`](elevation-borders-and-overlays.md), [`docs/gradients.md`](gradients.md) (a short topic page).

Follow this order when writing or rewriting one of these pages:

1. **One decision per page.** H1 plus one job sentence that names what choice this page owns. Don't restate the H1 in the next sentence.
2. **Terms or a recipe table first.** If the page introduces overloaded words (frame, scrim, panel glass) or a shared recipe, define them in a table before narrative.
3. **Decision tables next.** Prefer "token / CSS property → use when…" tables over long prose. Tables survive skim and MCP search better.
4. **State defaults as copy-paste values.** Token paths, px, opacity, and `color-mix` recipes. If a default is provisional, link the tracking issue and say not to invent a one-off consumer recipe.
5. **Lead with the correct choice**, then name the nearby wrong tool only when readers would reach for it (`shadow.outline` vs CSS `outline`; `semantic.elevation.card` vs `semantic.colors.surface.card`).
6. **Short code samples** of the preferred API shape only (`getDesignTokens()`, `CSSVariablesByColorMode`) — not every historical variant.
7. **Self-contained sections.** Avoid "see above"; restate the critical bit or link a sibling page for its own job (Every Page is Page One).
8. **Use must / should / can** for the strength of a rule. Don't soft-pedal a settled default with "prefer" or "pending" once the decision is closed.
9. **Sentence-case, rule-shaped headings** that skim as a table of contents ("Never nest two chrome-drawing surfaces").
10. **See also** for siblings — don't paste another page's tables. One owner per rule so docs don't drift.
11. **If the doc is MCP-served**, register it in [`packages/design-catalog/src/stylingDocSources.ts`](../packages/design-catalog/src/stylingDocSources.ts) (and the catalog turbo inputs). The `summary` must list searchable nouns (terms, tokens, defaults) — that is what `list_styling_docs` shows first.
12. **Keep length proportional.** Prefer a short sibling page over a mega-guide. If the doc must be long, use clear H2/H3 sections so `get_styling_doc({ section })` can fetch one piece.

### Adding a topic page

When a PR review produces a micro decision that does not belong on an existing page, add a short sibling rather than growing a mega-guide. Seed: [`docs/gradients.md`](gradients.md).

1. Write `docs/<topic>.md` following the order above. Pack the YAML `description:` with searchable nouns (CSS names, tokens, the rule); that string becomes the catalog `summary`.
2. Add a `{ slug, sourcePath, title }` entry in [`packages/design-catalog/src/stylingDocSources.ts`](../packages/design-catalog/src/stylingDocSources.ts) and the same path to the `@grafana/design-catalog#build` inputs in the root `turbo.json`. Coverage tests fail until both are done.
3. Link it from the parent reference a reader would otherwise grow (for example Color → Gradients). Don't paste the rule there.

If the decision is the same topic as an existing page, add a section on that page instead of a new file so `get_styling_doc({ section })` can fetch it.

Don't:

- Jump into mechanisms without defining terms agents will confuse (`border`, `outline`, `shadow.outline`).
- Say an API "comes later" without naming what to use until it lands.
- Duplicate the same rule across pages (link the owner instead).

## Agent-style rules

Agents writing prose here also follow [The Elements of Agent Style](https://github.com/yzhao062/agent-style) (CC BY 4.0) — 21 rules distilled from Strunk & White, Orwell, Pinker, and Gopen & Swan, plus field-observed LLM failure modes such as bullet overuse, em-dash punctuation, transition-word openers, and fabricated citations. The rules complement this guide: the guide sets the voice; agent-style catches the tells.

- The full rule bodies with BAD/GOOD examples are vendored at [`.agent-style/RULES.md`](../.agent-style/RULES.md).
- The compact directives load into every agent's context via the `written-style` rule in `.hatch/_rules/`, so they apply at generation time — to chat responses as much as committed prose.
- Two upstream rules are overridden to match this guide: headings use sentence case (not RULE-G's title case), and contractions stay (against RULE-I). The rest apply as written.

## What we take from GOV.UK — and what we don't

These sources serve the UK government's public-facing audience. We borrow the parts about clear thinking and clear writing, and skip the parts that exist for their publishing platform and legal context.

**We follow:** writing to a need, front-loading, plain English, active voice, the must/should/can distinction, descriptive headings and links, scannable structure, the human-but-precise tone, and inclusive language.

**We don't follow:**

- **A reading age of 9.** Our readers are engineers and designers. Write simply, but assume domain knowledge.
- **Fixed character limits for titles and summaries** (65 / 160 characters). Those serve GOV.UK search snippets, not our docs.
- **UK spelling.** The sources use UK spelling; we use **US English** throughout — refer to `AGENTS.md`.
- **The GOV.UK publishing mechanics** — `lang` attributes, change notes, signon-gated style-change tickets, external-link vetting for privacy and cookie policies. Not applicable here.

## Sources

- [GOV.UK tone of voice](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/tone-of-voice/)
  and its sub-pages: meeting user needs, clear structure, clear language, the right tone, links, titles, summaries
- [GOV.UK style guides: how to use them](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/how-to-use/)
- [Home Office readability guidance](https://design.homeoffice.gov.uk/accessibility/written-content/readability)
- [Home Office inclusive language guidance](https://design.homeoffice.gov.uk/accessibility/written-content/inclusive-language)
- [Grafana docs-ai shared style guide](https://github.com/grafana/docs-ai/blob/main/skills/shared/style-guide.md) — the source of the UI text, placeholder, product naming, "refer to", and Every Page is Page One conventions above (its Hugo templates and shortcodes don't apply here)
