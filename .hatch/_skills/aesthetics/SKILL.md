---
targets: [claude, codex]
name: aesthetics
description: Comprehensive design system for UI implementation. Covers visual language, micro-interactions, content presentation, and accessibility. Consult when building interfaces, evaluating design decisions, or ensuring consistency across projects.
---

# Aesthetics

A complete reference for building interfaces with intention. This document codifies visual principles, interaction patterns, and decision frameworks that create cohesive, refined experiences.

## When to consult this skill

- Building any UI component from scratch
- Implementing interactive states (hover, focus, active, loading, error)
- Making decisions about spacing, typography, or color
- Adding motion or transitions
- Handling edge cases (empty states, errors, loading)
- Evaluating whether a design choice fits the aesthetic
- Transferring these principles to new projects

## Supporting documents

- **[visual-system.md](./visual-system.md)** — Color, typography, depth, spacing, density
- **[interactions.md](./interactions.md)** — Hover, focus, buttons, forms, loading, errors
- **[motion.md](./motion.md)** — Spring physics, entrance patterns, timing, reduced motion
- **[components.md](./components.md)** — Dropdowns, modals, tabs, drag-drop, cards, lists, panels
- **[content.md](./content.md)** — Prose styling, images, code blocks, empty states

---

## Core philosophy

### Intentional atmosphere

Every design choice contributes to mood. Decoration isn't forbidden; it's earned. Visual elements can serve atmosphere without serving direct function, but they must be deliberate. The goal is an environment that feels considered, not assembled.

**The test**: Can you articulate why this element exists? If the answer is "it looked empty without it," dig deeper. What feeling does the emptiness create? Is that wrong for this context?

### Pragmatic restraint

Minimize without sterilizing. Remove what doesn't serve the experience, but don't pursue minimalism as ideology. Cold, sterile interfaces fail as much as cluttered ones. The goal is clarity and focus with just enough warmth.

**The balance**: When removing an element makes the interface feel cold, add texture deliberately rather than restoring the original element.

### Subtle refinement

The best interactions are barely perceptible but deeply satisfying. Users shouldn't notice the design; they should feel comfortable using it. Refinement lives in the details: the exact timing of a transition, the precise shade of a hover state, the rhythm of spacing.

**The standard**: If you can describe the effect in superlatives ("stunning animation," "beautiful transition"), it's probably too much. Aim for "feels right."

### Physical authenticity

Interfaces should feel like they exist in physical space. This doesn't mean skeuomorphism; it means respecting how objects behave. Elements have weight. Motion follows physics. Surfaces have depth. Light creates shadow.

---

## Decision framework

### Before adding any element

1. **What purpose does it serve?** Function, hierarchy, or atmosphere? Decoration without purpose is clutter.
2. **Does it work in both themes?** Check light and dark mode.
3. **Does it use theme tokens?** No arbitrary hex values or magic numbers.
4. **What happens on mobile?** Touch users can't hover.
5. **What happens at different sizes?** Container queries, not assumptions.

### Before adding animation

1. **Does it provide feedback?** Animation should confirm user action.
2. **Does it orient the user?** Motion should clarify spatial relationships.
3. **Is this action frequent?** Frequent actions need minimal animation.
4. **Would it feel broken without it?** If removing the animation makes the interaction confusing, keep it. If not, reconsider.

### When in doubt

- **Simpler is usually right**: Between two options, pick the simpler one.
- **Restraint over expression**: When you want to add something, wait. Add it only if the absence genuinely hurts.
- **Consistency over cleverness**: Match existing patterns. Don't introduce new ones without good reason.

---

## Avoiding generic AI output

AI-generated UI tends toward patterns that feel soulless and undifferentiated. Avoid:

### Visual sameness

- **Gradient everything**: Gradients on buttons, cards, backgrounds: the "startup landing page" look
- **Pill buttons with shadows**: Rounded buttons with heavy drop shadows and gradients
- **Hero sections with blurred blobs**: Abstract gradient shapes floating behind text
- **Card grids with identical shadows**: Every card elevated the same amount
- **Excessive whitespace without purpose**: Space that doesn't group or separate, just fills

### Interaction patterns

- **Everything bounces**: Over-springy animations on every element
- **Confetti on success**: Celebratory animations for mundane actions
- **Scroll animations on everything**: Elements that fly/fade/scale as you scroll
- **Hover effects that transform**: Scale, rotate, shadow, color all changing at once
- **Loading spinners everywhere**: Generic spinners instead of skeleton or optimistic UI

### Content patterns

- **"Welcome to..."**: Generic greeting headlines
- **Feature lists with icons**: Three-column grids of icon + headline + paragraph
- **"Get started" CTAs**: Vague action buttons
- **Stock photo diversity panels**: Obviously staged photography
- **Testimonial carousels**: Rotating quotes with star ratings

### The antidote

- Use restraint. One effect, not five.
- Let content lead. UI serves content, not the reverse.
- Build hierarchy through typography and space, not decoration.
- Make deliberate choices. Every element should be defensible.
- When something looks "nice" but generic, question it.

---

## Anti-patterns summary

| Don't                          | Why                      | Instead                         |
| ------------------------------ | ------------------------ | ------------------------------- |
| Transparent white for anything | Washes out, looks washed | Solid colors from neutral scale |
| Multiple accent colors         | Destroys hierarchy       | One warm accent only            |
| Colored text for emphasis      | Visual noise             | Weight, size, or solid grays    |
| Linear easing                  | Robotic                  | Spring physics                  |
| Scale/elevation on hover       | Over-designed            | Color shift only                |
| Gradients as decoration        | Generic AI look          | Solid colors, earned depth      |
| Everything animated            | Overwhelming             | Animate state changes only      |
| Arbitrary pixel values         | Inconsistent             | Spacing scale only              |
| ems/rems                       | Unpredictable scaling    | Pixels (px) exclusively         |
| Borders between everything     | Visual clutter           | Space and color to separate     |

---

## Quick reference

### Color

- Neutral palette: neutral-50 through neutral-950 (solid colors)
- One accent color: warm golden amber
- Text hierarchy: solid grays, not transparent white
- Dark backgrounds: solid colors (neutral-900, neutral-950)
- Overlays only: translucent black with backdrop blur

### Typography

- Inter for all text, hierarchy through weight
- Headlines: semibold (600), body: regular (400)
- All measurements in pixels (px)
- Max measure: ~65 characters for readability

### Depth

- Box-shadow with 1px spread replaces borders (blends with any background)
- Multi-layer shadows on floating elements only
- Reserve elevation for interactive/floating elements

### Interactions

- Hover: color shift with 150-200ms transition
- Focus: ring outline (focus-visible:ring-2)
- Active: same as hover (no separate state needed)
- Loading: appropriate loading boundaries, optimistic UI where possible
- Errors: red icon indicator, neutral text

### Motion

- Spring physics, never linear
- Bounce 0.15 for UI, 0.4 for playful
- Opacity ≤200ms
- Disable completely for reduced-motion

### Icons

- Small and understated
- Functional only; don't decorate with icons
- Match visual weight of adjacent text

### Accessibility

- Contrast: APCA preferred over WCAG (aligns with OKLCH)
- Semantic HTML first
- Focus order follows visual order
- Theme: system default, user can override
