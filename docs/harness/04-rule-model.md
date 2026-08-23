# 04 — Rule model

Every rule in the system has two coordinates. Place a rule on both and its home is obvious, along with how strongly it is allowed to bite. This coordinate system is the spine that holds the whole thing together, because it ends the recurring question of where any given rule should go.

The two axes are **scope**, which says where the rule is true, and **enforcement mode**, which says how reliably a violation can be detected.

## Before the axes: is it even a rule?

A prior question decides whether something belongs in this system at all, and it turns on whether the thing has legitimate variation.

- A property with exactly one correct value that must never vary is owned by a **token** or by a **component**, not by a rule. A single brand color is a token. A fixed four-pixel gap between action buttons is owned by a ButtonGroup that bakes it in. There is nothing to check, because there is nothing to get wrong once the token or component is used.
- A property with a bounded set of acceptable values is a **rule**, a constraint over that variation. Sanctioned button heights, contrast floors, "at most one primary action in a header".
- A property free to vary by context is **neither**. It is left to the consumer and appears in no rule.

The test, in one line: if it is fixed, a token or component owns it; if it varies within bounds, a rule governs it; if it is free, leave it alone. Only the middle case enters the coordinate system below.

## Axis one: scope

Scope answers where the rule is true, and it has three levels that cascade.

**Global.** True everywhere, regardless of which component or pattern you are in. "Use the token, not a literal." "Chrome edges via shadow, not border." "No saturated color blocks." These are the house style and the anti-slop rules. They form a single global ruleset, the system law, that applies to all consumer code including net-new components that have no contract of their own.

**Pattern.** True only inside a particular pattern. "A wizard must update the URL on step change." "Inside a page header, at most one primary button." These live in per-pattern contracts and only apply where that pattern is in use.

**Component.** True only for a specific component. Refinements that hold for Button and nowhere else.

The three cascade like CSS. A global rule applies unless a more specific scope tightens or overrides it. A pattern rule can add constraints on top of the global ones. A component rule can refine further. This is a model engineers already carry in their heads, and it means a rule lives at exactly the scope where it is true: state the rule once, at the broadest scope it holds for, and let specificity layer on top.

The practical consequence is that there are three homes for rules, not one. A global house-style and anti-slop ruleset, per-pattern contracts, and per-component refinements. None of them is the single right place. The right place is wherever the rule is actually true.

## Axis two: enforcement mode

Enforcement mode answers how reliably a violation can be detected, and it decides how strongly the rule is allowed to bite.

**Deterministic.** The rule has a crisp, checkable fingerprint with effectively no false positives. "No raw hex." "Uses aria-disabled, not the disabled attribute." "The URL changed when I drove the wizard to the next step." A deterministic rule can be a MUST and can block a merge, because when it fires it is right.

**Structural-proxy.** The rule is about something slightly fuzzy, but a structural signal stands in for it well enough to be useful. "Do not decorate a resting card with an accent edge" has the proxy "an accent border not tied to a selected or active state". "Long forms should be sectioned" has the proxy "more than N fields with no section boundary". These have honest false positives, so they usually sit at SHOULD and warn rather than block, paired with the expiring-grant escape hatch from `07-validation-pipeline.md`. They are the seam where design judgment becomes checkable, and where a lot of the distinctive value lives: these are the rules even good design systems never encode.

**Advisory.** The rule is genuine judgment with no usable fingerprint. "Is a wizard the right metaphor for this task." "Does this composition feel balanced." These can never be a hard gate. They are served to the agent as guidance before it builds, and at most surfaced as non-blocking notes. The cases a human must settle escalate to the design team.

Enforcement mode caps severity. Deterministic rules may block. Structural-proxy rules should warn. Advisory rules only inform. The `check` type on a requirement, static, runtime, visual, or ai, is the machinery that realizes the mode: a deterministic rule is usually static or a crisp runtime assertion, a structural proxy is a static or runtime pattern match, an advisory rule is ai or pure guidance. Refer to `03-contracts.md` for the requirement shape and `07-validation-pipeline.md` for the check ladder.

## Rules graduate

Enforcement mode is not fixed for a given rule. A rule can move toward determinism as we understand it better. Something that starts advisory, "this feels cluttered", can be promoted once we find the structural signal underneath it, "stacked cards with a gap below eight pixels". At that point it becomes a structural-proxy or even deterministic rule that can warn or block. The whole system is expected to get more capable over time as advisory observations are converted into hard rules. The harness is the apparatus that makes that conversion possible.

## The grid

Putting the two axes together gives a grid, and every rule lands in a cell. A few worked placements:

```
                deterministic            structural-proxy           advisory
            +------------------------+------------------------+------------------------+
  global    | use the token, not a   | no accent edge on a    | does this screen feel  |
            | literal; chrome via    | resting (non-state)    | like our product       |
            | shadow not border      | card; over-rounding    | (guidance to agent)    |
            +------------------------+------------------------+------------------------+
  pattern   | wizard updates the URL;| single-step wizard;    | is a wizard the right  |
            | every step reachable   | 14 fields, no sections | metaphor for this task |
            +------------------------+------------------------+------------------------+
  component | Button uses            | destructive variant    | is this the right tone |
            | aria-disabled          | used for a non-        | for this Button's      |
            |                        | destructive action     | context                |
            +------------------------+------------------------+------------------------+
```

The left column blocks. The middle column warns, with grants for the false positives. The right column advises and, where a human is needed, escalates. Reading down a column shows the same kind of check applied at three scopes. Reading across a row shows one scope's rules sorted by how confidently they can be enforced.

## Placing a rule

"Should taste be in the contract" has no single answer because taste is not one thing. Split it by the two axes and each part lands: the structurally-checkable part goes into the appropriate ruleset and can bite, the judgment part becomes guidance, and the fixed part was never a rule and belongs in a token or component.
