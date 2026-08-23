# What an Agentic Experience Platform is (formerly "Agentic Design System")

_Author: Ben Darlow_

> These are the author’s (relatively) unstructured thoughts on what an Agentic
> Experience Platform is. They are not necessarily the view of the PDE team as a
> whole, but more a starting point for a conversation around focusing our shared
> view of this concept.

Each of these steps should lean heavily on agentic tools to accelerate the
process:

1. Build atoms/primitives, and identify clear patterns of usage, design
   principles etc.
2. Identify common UI components and rebuild them using the new atoms/primitives
   and design principles
3. Build tooling to help teams adopt the new UI, and at the same time use this
   process to identify UI _patterns_ which will also be documented within the
   Agentic Experience Platform
4. Build systems to allow agentic tools to _dynamically_ generate UI, using a
   combination of existing patterns, components and design principles. It should
   reach for the highest-level abstraction that already exists. If there is
   nothing suitable, it should be able to ‘break the abstraction down’ and
   operate at the next lower level abstraction to solve the problem.

Each step along the way is like the layers of an onion. Once we’ve gotten it
stable and mature, we (mostly) move on to the next layer of the onion, until
that layer is also stable and mature, and so on.

---

## Expanded breakdown

### Layer 1 — Atoms, primitives, and design principles

The first layer is a set of primitives, design principles and conventions.
Values are tokens, icons, typography. Conventions are the spelling, the file
shape, the naming, the way color modes are expressed.

Convention does as much work at this layer as value does. A consistent file
layout lets a generator produce something usable without ambiguity. A
consistent color-mode pattern lets a consumer pick a component out of the
catalog and know what to wire up. Humans bring discipline through habit;
agents have to read it, and the convention layer is where they start.

This layer comes first because of dependency. Tokens before components,
components before patterns, patterns before generation. A weak primitive layer
cascades into ad-hoc decisions on every later layer. Getting this layer right is
important, but once it’s complete it will mostly become a static foundational
dependency. For that reason, agentic tooling is largely of use in getting up the
curve faster: it’s less of an ongoing effort than something we build and ship,
before moving our attention elsewhere.

### Layer 2 — Composing components from primitives

The second layer turns primitives into things teams can drop in. Each
component obeys the convention layer rather than negotiating with it: it
draws values from the tokens, applies the file structure, exposes a
predictable public surface.

The constraints help us ensure our emerging Agentic Experience Platform’s surface area
is cohesive and predictable, both for humans and agents. It means every
component points to the rationale for why it behaves the way it does, in a way
that allows us to inform future decisions consistently.

The components built here aren't the final product. They're the vocabulary the
higher layers compose against. When building components, we lean heavily on
agentic tooling to ensure we’re following the conventions laid out by the first
layer.

Initially, we won’t have a layer of semantics on top of primitives like tokens
and atoms. As we build out more surface area, these will emerge: the tooling
will identify patterns of usage and transform them into a new semantic layer.

### Layer 3 — Tooling for adoption, and patterns surfacing from real use

The third layer is where the Agentic Experience Platform stops being a hypothetical
exercise and starts to deliver real value to teams. The work here is in building
out agentic tooling: MCP servers, increasingly-sophisticated definitions for
organisms and patterns, deterministic code mods and skills, guard rails which
teams can build into CI processes. These give teams practical tools and
workflows they can reach for to adopt the Agentic Experience Platform in their
applications.

Pattern identification belongs at this layer because patterns (combinations of
components that recur enough to be worth codifying) are emergent. Patterns are
discovered by watching adoption, not by predicting them upfront, so the Agentic Experience Platform
needs a path for pattern feedback, to inform and guide future use.

The deliberate work is to keep every artifact dual-purpose: readable by
humans navigating the system and parseable by agents driving it. The same
prose that documents a component for a designer is the prose an agent reads
when asked to use it.

### Layer 4 — Dynamic agentic UI

The fourth layer is the final shape of the whole project. An agent takes an
intent (a prompt, a sketch, a tracked issue) and synthesizes UI. The
four-step framing tells it where to operate:

- **Reach for a pattern.** If one covers the use case, use it.
- **Drop to components.** If no pattern fits, compose from the component
  vocabulary.
- **Drop to primitives.** If no component fits, build from tokens and icons.
- **Surface a gap.** If even a primitive is missing, that's a finding, not a
  problem to paper over.

The last point separates a mature Agentic Experience Platform from a generator pointed
at a component library. A generator covers gaps by inventing something to meet
the demands placed upon it; an Agentic Experience Platform reveals those gaps and uses
them to steer the whole system.

### The onion metaphor in practice

The metaphor implies layers built outward from the center, each stabilized
before the next is built on top.

**Stable doesn't mean frozen.** Each layer keeps evolving as the ones above
it reveal gaps. Stable means the surface is reliable, not that it stops
moving.

**Moving on is selective.** Working on the next layer doesn't mean
abandoning the previous one. It means the previous one is the established
surface, not the focal one. When a higher layer reveals a missing primitive,
the fix belongs at the primitive, not in a workaround above.

**Layers are concentric for consumers.** Internally each layer was built in
sequence. A consumer reaches in from outside and finds every layer available
at once. The sequencing describes how the system was authored, not how it's
used.

### What makes it "agentic"

A traditional design system is a library plus a docs site. Humans navigate
the docs, copy snippets, follow conventions through discipline. It works
because the team is disciplined.

An agentic design system structures the same artifacts to be legible to
agents at the same time as humans. The docs aren't separate from the
machine-facing surface: they are the machine-facing surface. The
conventions aren't only for human consistency: they remove ambiguity from
the paths an agent will walk. The procedures aren't only documented:
they're executable where the agent is already working.

Being "agentic" doesn't mean agents replace humans. It means the
disciplines that make a design system durable for humans (consistency,
documentation, predictable abstractions) are precisely the disciplines
that make it drivable by agents. One artifact, two readers.

The onion grows outward; the agents grow inward.
