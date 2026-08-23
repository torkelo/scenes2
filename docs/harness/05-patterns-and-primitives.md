# 05 — Patterns and primitives

A pattern is a composition of components that solves a problem: a wizard, a detail page with a sticky action bar, a settings layout. The knowledge of what makes a composition correct lives only in docs and people's heads today, and nothing validates it. This is the altitude where contracts earn their keep most.

A multi-step wizard is used as the running example below. It is illustrative, not a canonical reference, just a composition concrete enough to show the mechanics on.

## The example

A wizard's defining rules are behavioral, not aesthetic: the user can see which step they are on, can move forward and back, every step is reachable, and the URL updates so the flow is linkable and the back button works. These are invariants any valid wizard satisfies, and the kind of thing that gets built wrong from a component library and a usage doc.

## The two old ways

- **Ship a rigid component.** A `<Wizard>` full of slots. Enforces the rules by construction but is brittle and resists variation; the moment a team needs an unanticipated shape they are stuck.
- **Ship only documentation.** Maximally flexible, completely unenforced. Nothing checks that what was built is a valid wizard.

The path between them is thin primitives that carry the structure, paired with a contract that validates the composition.

## Compound, headless primitives

The primitive layer uses the compound, headless idiom (Radix, React Aria, Ariakit). **Compound**: a pattern is small components that share state and are arranged by the consumer (`Tabs.Root`, `Tabs.List`, `Tabs.Trigger`, `Tabs.Content`) rather than one monolith. **Headless**: the parts carry behavior, state, keyboard handling, and ARIA, but no styling.

## Thin structural primitives are the affordance layer

A rigid composite is brittle because it owns layout and content. A loose pattern is vague because it owns nothing, so there is no handle. The option between them owns only the semantic structure: a `PageHeader` that is a landmark div with a marker and no opinion on its contents, a `Wizard.Root` / `Wizard.Steps` / `Wizard.Step` trio that declares the regions and wires a little context, with no say over how a step looks.

These are not brittle, because they do not constrain what you would want to vary. They keep markup clean, because the marker that makes a region findable lives inside the component; the consumer writes `<PageHeader>` and the affordance is there. Littering only happens if people hand-write data attributes. The primitives name the regions, which is what lets a generic conformance check find and drive them.

## How a contract differs from shipping primitives

Headless primitives guarantee that each part is internally correct (roving tabindex, `aria-selected`, keyboard nav). They have no concept of three things:

- **Whether you used them.** Nothing stops a consumer hand-rolling tabs from divs.
- **How parts relate.** A Tabs primitive governs its own subtree, not "the header may contain at most one primary button".
- **Your design intent.** Generic primitives will never sync a URL or guarantee a back affordance, because those are the wizard's defining rules and the primitive has no idea you wanted a wizard.

So primitives guarantee the parts in isolation, and nothing about the composition, the project-specific rules, or whether the assembled whole is what you intended. The contract carries the intent, checked against any implementation including one that ignored the primitives. The primitives carry the handles that make the check cheap.

## Easy is not done

If `Wizard.Root` bakes in URL sync and a back button, why check it. Because the component enforces only the path it controls, and a flexible compound component has many paths it does not: steps rendered outside the root, an overridden onClick, a conditionally hidden back control, reordered steps. The component makes the correct assembly the default; the contract verifies it happened.

The framing for the whole layer: a rigid monolith buys safety by removing flexibility; a flexible primitive plus a contract buys it back by checking the result instead of constraining the input, and keeps the flexibility. The more flexible the primitive, the more a contract earns its place.

## Driving an implementation we have never seen

A behavioral pattern contract is an executable conformance suite, and to run it the suite must find the controls. The contract mandates the affordances that make it drivable: steps as a `tablist` with `tab` children, the current step as the selected tab, a next control with an accessible name. The suite then drives any compliant implementation. The behavioral contract and the accessibility contract become the same requirement.

## The soft spot

This is clean when the pattern maps onto an existing ARIA vocabulary. Many do not (a sticky action bar, an incident triage flow). For those, either define a per-pattern structural vocabulary carried by the primitives, or the contract slumps back into prose. Whether that vocabulary approach scales to every pattern worth contracting is an open question in `12-open-questions.md`.

## Capability, not layout

Contract user-observable behavior and capability, never layout or aesthetics. "The user can always see which step they are on" belongs in the contract; "the step numbers are on the left" belongs to the exemplar. Crisp invariants (the URL updates, navigation works, every step reachable) form the spine of the suite. Fuzzy ones (a transition visibly played) flake and are demoted to advisory or expressed as "uses the motion primitive".

## What we ship for a pattern

1. The **behavioral contract**, the tiered invariants.
2. The **conformance suite** that validates any implementation, authored once.
3. The **recommended primitives** that carry the affordances.
4. An **exemplar**, one valid implementation that passes its own suite.

The exemplar is a starting point, not a cage. Teams compose freely, and the suite certifies the result is still a valid instance, with no one in the pull request and no per-app tests written.
