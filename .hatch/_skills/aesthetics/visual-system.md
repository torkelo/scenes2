# Visual system

Color, typography, depth, spacing, and density principles.

---

## Color

### Neutral foundation

Build on a true neutral palette. Not gray (too cold), not warm gray (too stylized).

```
Light mode: neutral-50 background, neutral-900 text
Dark mode: neutral-950 background, neutral-50 text
```

All colors are **solid**. Never use transparent white (`white/50`, `white/70`, etc.) for text, backgrounds, or UI elements.

### Single accent color

One accent color. Not two. Not "primary and secondary." One.

```css
--color-accent: oklch(0.78 0.17 43.48); /* warm golden amber */
```

**Reserve accent for:**

- Text links (not buttons)
- Active/selected indicators
- Interactive highlights

**Never use accent for:**

- Button backgrounds
- Decorative elements
- Status indicators
- Background fills

### Text hierarchy

Establish text hierarchy through the neutral scale, not opacity:

```jsx
// Primary text
className = 'text-neutral-900 dark:text-neutral-50';

// Secondary text
className = 'text-neutral-600 dark:text-neutral-400';

// Tertiary text
className = 'text-neutral-400 dark:text-neutral-500';
```

### Dark mode backgrounds

Dark backgrounds use **solid colors**:

```jsx
// Page background
className = 'bg-neutral-950';

// Elevated surface
className = 'bg-neutral-900';

// Subtle surface differentiation
className = 'bg-neutral-800';
```

### Overlays only

The only exception to solid colors: overlays that need to reveal content behind them.

```jsx
// Modal/dialog backdrop
className = 'bg-black/50 backdrop-blur-sm';

// Dropdown over varied backgrounds
className = 'bg-neutral-900/95 backdrop-blur-md';
```

---

## Typography

### Font stack

Inter is the primary typeface for all text. It provides excellent readability at both small and large sizes, with a neutral character that works well for technical documentation.

| Role      | Treatment              | Purpose                              |
| --------- | ---------------------- | ------------------------------------ |
| Body      | Inter, regular weight  | Readable, neutral, contemporary      |
| Headlines | Inter, medium/semibold | Establishes hierarchy through weight |
| Code      | System monospace       | Functional, consistent               |

### Weight hierarchy

```jsx
// Headlines
className = 'font-semibold'; // 600

// Section headings
className = 'font-medium'; // 500

// Body text
className = 'font-normal'; // 400

// Emphasis (sparingly)
className = 'font-semibold'; // 600
```

### Size hierarchy

Hierarchy through size and weight, never through color:

```jsx
// Correct
<h1 className="text-3xl font-semibold">Page Title</h1>
<h2 className="text-xl font-medium">Section</h2>
<p className="text-base">Body text</p>

// Wrong: color for hierarchy
<h1 className="text-blue-600">Page Title</h1>
```

### Units

**Pixels (px) exclusively.** No ems, no rems. Pixels provide predictable, consistent sizing.

### Reading measure

Max line length for body text: ~65 characters.

```jsx
className = 'max-w-prose';
```

---

## Depth and shadow

### The 1px spread shadow

Use box-shadow with 1px spread as a border replacement. Unlike the border property, spread shadows blend with any background:

```css
box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
```

```jsx
className = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08)]';
```

This creates a subtle edge definition without the harsh line of a border.

### Multi-layer shadows

For elevated elements, use multiple shadow layers:

```css
/* Subtle elevation */
--shadow-sm: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);

/* Standard elevation */
--shadow-md:
  0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06),
  0 2px 4px rgba(0, 0, 0, 0.06);

/* Pronounced elevation */
--shadow-lg:
  0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.04),
  0 4px 8px rgba(0, 0, 0, 0.06), 0 8px 16px rgba(0, 0, 0, 0.08);
```

### Earned elevation

Not everything gets a shadow. Shadows indicate:

- Floating elements (dropdowns, popovers, modals)
- Interactive cards that lift
- Fixed/sticky navigation

Static content does not need elevation.

---

## Corner radius

### Concentric corners

When a rounded element is inset inside another by an even gap, the outer radius must equal the inner radius plus that gap:

```
outer radius = inner radius + inset
```

Give the two the same radius and the outer corner reads as too tight — the gap between the arcs pinches at the corners instead of holding constant. A card with an 8px radius, framed by a container that pads it 4px on every side, needs a 12px radius on the frame.

**Don't double the inset.** If the frame already pads by the gap, the child must not re-add its own padding at that edge, or it lands twice the gap from the corner and the arcs stop nesting.

---

## Spacing

### Tailwind scale only

Use the default Tailwind spacing scale. No arbitrary values:

```jsx
// Correct
className = 'p-4 gap-3 mt-8';

// Wrong
className = 'p-[13px] gap-[7px]';
```

### Spacing by relationship

Related items cluster tightly. Unrelated sections separate generously:

```jsx
// Tight: within groups
<div className="flex gap-2">
  <Icon />
  <Label />
</div>;

// Standard: between fields
className = 'space-y-4';

// Generous: between sections
className = 'mt-12';
```

### Spacing scale reference

| Spacing       | Use                           |
| ------------- | ----------------------------- |
| gap-1, gap-2  | Icon + label, tight groupings |
| gap-3, gap-4  | Form fields, list items       |
| gap-6, gap-8  | Card sections, subsections    |
| mt-12, gap-12 | Major section breaks          |

### Borders as last resort

Avoid borders. Use space and background color to separate elements. When a border is truly needed:

```jsx
className = 'border-neutral-200 dark:border-neutral-800';
```

Or use the 1px spread shadow (preferred).

---

## Density

### Context determines density

| Context                   | Density  | Spacing             |
| ------------------------- | -------- | ------------------- |
| Reading (articles, docs)  | Sparse   | Generous whitespace |
| Tools (dashboards, admin) | Dense    | Efficient, compact  |
| Navigation                | Balanced | Clear affordances   |

Don't apply one density universally. Let content dictate.
