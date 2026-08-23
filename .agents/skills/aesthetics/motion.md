# Motion

Spring physics, entrance patterns, timing principles, and reduced motion.

---

## Philosophy

Animation adds life but never distracts. Motion should feel physical and responsive, not performative. The user should feel the interface reacting to them, not watching it perform.

---

## Spring physics

### Always springs, never linear

Linear easing feels robotic. Spring physics simulate real-world behavior.

```typescript
// Correct
{ type: "spring", bounce: 0.15, duration: 0.4 }

// Wrong
{ ease: "linear", duration: 0.3 }
{ ease: "easeInOut", duration: 0.3 }
```

### Bounce levels

| Bounce    | Feel                     | Use for                                     |
| --------- | ------------------------ | ------------------------------------------- |
| 0.10-0.15 | Controlled, professional | Sidebars, panels, navigation, structural UI |
| 0.20-0.25 | Responsive, natural      | Expandable sections, accordions, reveals    |
| 0.35-0.40 | Playful, lively          | Toasts, notifications, celebrations         |

### Standard configs

```typescript
// UI structure (panels, sidebars, navigation)
const uiSpring = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.4,
};

// Content reveals (lists, cards appearing)
const contentSpring = {
  type: 'spring',
  bounce: 0.15,
  duration: 0.3,
};

// Notifications (toasts, alerts)
const notifySpring = {
  type: 'spring',
  bounce: 0.4,
  duration: 0.5,
};
```

---

## Entrance pattern: blur-fade-rise

Standard entrance for content appearing:

```typescript
const enterVariants = {
  hidden: {
    opacity: 0,
    y: 8,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      bounce: 0.15,
      duration: 0.3,
    },
  },
};
```

Elements fade in, rise slightly, and sharpen from blur.

---

## Timing principles

### Opacity is always fast

Opacity changes should be snappy: ≤200ms. Physical movement (x, y, scale) can take longer.

```typescript
// Opacity separate from movement
transition: {
  opacity: { duration: 0.15 },
  y: { type: "spring", bounce: 0.15, duration: 0.4 }
}
```

### Exit faster than enter

Users want to dismiss things quickly:

```typescript
exit: {
  opacity: 0,
  y: -4,
  transition: { duration: 0.15 }
}
```

### Stagger siblings

Related items appear in sequence, not all at once:

```typescript
// Container
transition: {
  staggerChildren: 0.04;
}

// Or explicit delays
transition: {
  delay: index * 0.03;
}
```

Stagger 30-50ms between items.

### Navigation is instant

Click → immediate feedback. Main content changes instantly. Only animate secondary elements (sidebars, overlays).

---

## Route transitions

### Content-aware

Different content types deserve different transitions:

| Navigation       | Transition               |
| ---------------- | ------------------------ |
| Within a section | Crossfade (opacity only) |
| Drilling down    | Content rises from below |
| Going back       | Content exits downward   |
| Unrelated pages  | Simple crossfade         |

### Keep it simple

Route transitions should be subtle. Users navigate frequently; don't make them wait for animations.

---

## Reduced motion

### Respect completely

When `prefers-reduced-motion` is enabled, disable all animation. No "simplified" motion. Instant state changes only.

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches;

const transition = prefersReducedMotion
  ? { duration: 0 }
  : { type: 'spring', bounce: 0.15, duration: 0.4 };
```

### CSS approach

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## What not to animate

- **Frequent actions**: Scrolling, typing, cursor movement
- **Static content**: Content that's already visible
- **Scroll-triggered reveals**: Interrupts reading, feels gimmicky
- **Everything at once**: Stagger or animate only what's changing

---

## Anti-patterns

| Don't                        | Why                       | Instead            |
| ---------------------------- | ------------------------- | ------------------ |
| Linear easing                | Robotic                   | Spring physics     |
| High bounce on UI (>0.2)     | Too playful for structure | 0.10-0.15          |
| Slow opacity (>200ms)        | Sluggish                  | Keep opacity fast  |
| Everything animates together | Artificial                | Stagger 30-50ms    |
| Scroll-triggered animations  | Interrupts reading        | Entrance only      |
| Ignoring reduced-motion      | Accessibility failure     | Disable completely |
