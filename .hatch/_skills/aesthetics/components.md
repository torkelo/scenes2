# Components

Dropdowns, modals, tabs, drag-drop, and common composition patterns.

---

## Dropdowns and select menus

### Appearance

Dropdowns are floating elements; they earn elevation. Use multi-layer shadows and the 1px spread edge:

```jsx
className="
  bg-white dark:bg-neutral-900
  shadow-lg
  rounded-lg
"
```

### Animation

Quick spring, subtle scale from origin:

```typescript
const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.15, duration: 0.2 },
  },
};
```

### Behavior

- Open on click, not hover
- Close on: click outside, Escape key, or selection
- Selected item: accent indicator (left border or subtle background)
- Keyboard: arrow keys move focus, Enter selects, type-ahead for long lists

---

## Modals and dialogs

### When to use

Modals interrupt context. Use sparingly:

**Appropriate:**

- Destructive actions requiring confirmation
- Complex forms needing focus
- Content requiring full attention

**Not appropriate:**

- Simple confirmations (use inline)
- Navigation (use routing)
- Information display (use panels or drawers)

### Appearance

```jsx
// Backdrop (translucent black - one of few exceptions)
className="fixed inset-0 bg-black/50 backdrop-blur-sm"

// Dialog
className="
  bg-white dark:bg-neutral-900
  shadow-2xl
  rounded-xl
  max-w-lg w-full
  p-24
"
```

### Animation

```typescript
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', bounce: 0.2, duration: 0.3 },
  },
};
```

### Behavior

- Focus traps inside modal
- Close on Escape key
- Close on backdrop click (unless destructive action in progress)
- Restore focus to trigger on close
- Prevent body scroll while open

---

## Tabs

### Appearance

Subtle selected indication (accent underline or background shift):

```jsx
// Tab container
className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800"

// Tab button
className={`
  px-16 py-8
  text-neutral-600 dark:text-neutral-400
  hover:text-neutral-900 dark:hover:text-neutral-200
  transition-colors duration-150
  ${isActive ? "text-neutral-900 dark:text-neutral-50 border-b-2 border-accent" : ""}
`}
```

### Animation

Selected indicator animates between tabs:

```tsx
<motion.div
  layoutId="tab-indicator"
  className="absolute bottom-0 left-0 right-0 h-2 bg-accent"
/>
```

### Behavior

- Arrow keys move between tabs
- Content changes immediately (no loading states for local content)
- URL reflects selected tab when tabs represent views
- Selected tab visually distinct without color alone

---

## Drag and drop

### Visual feedback

```jsx
// Item being dragged
className = 'shadow-lg scale-[1.02] opacity-90';

// Valid drop target
className = 'ring-2 ring-accent ring-offset-2';

// Invalid drop target
className = 'opacity-50';
```

### Animation

- Pickup: scale 1.02-1.05 with spring
- During drag: follows cursor with slight lag
- Drop: spring back to position (bounce 0.2)
- Reorder: siblings shift with spring

### Behavior

- Ghost matches actual item appearance
- Clear drop target indication
- Cancel with Escape
- Touch: long-press to initiate (300ms)
- Keyboard alternative: arrow keys + modifier for reorder

---

## Card pattern

Cards group related content with clear boundaries.

```jsx
// Standard card
className="
  bg-white dark:bg-neutral-900
  rounded-lg
  p-16
  shadow-[0_0_0_1px_rgba(0,0,0,0.08)]
"

// Interactive card
className="
  bg-white dark:bg-neutral-900
  rounded-lg
  p-16
  shadow-md
  hover:shadow-lg
  transition-shadow duration-150
"
```

**Anatomy:**

- Header (optional): title + metadata, tight spacing
- Body: main content, standard spacing
- Footer (optional): actions, separated by space

---

## List pattern

Collections of items with shared structure.

```jsx
// Container
className="divide-y divide-neutral-100 dark:divide-neutral-800"

// Item
className="
  py-12 px-16
  hover:bg-neutral-50 dark:hover:bg-neutral-800
  flex items-center gap-12
  transition-colors duration-150
"
```

**Item anatomy:**

- Leading: icon, avatar, indicator (fixed width)
- Content: primary + secondary text (flex-grow)
- Trailing: action, metadata, chevron (fixed width)

---

## Panel pattern

Contextual content alongside primary content.

```jsx
className="
  w-320
  border-l border-neutral-200 dark:border-neutral-800
  bg-neutral-50 dark:bg-neutral-900
  overflow-y-auto
"
```

**Behavior:**

- Fixed width or resizable
- Collapses with spring animation (bounce 0.15)
- Content scrolls independently

---

## Form pattern

```jsx
// Group
className="space-y-16"

// Field wrapper
className="space-y-4"

// Label
className="text-sm font-medium text-neutral-700 dark:text-neutral-300"

// Input
className="
  w-full px-12 py-8
  bg-white dark:bg-neutral-900
  border border-neutral-200 dark:border-neutral-700
  rounded-md
  focus:ring-2 focus:ring-accent focus:border-transparent
"

// Helper
className="text-sm text-neutral-500 dark:text-neutral-400"
```

---

## Composition principles

### Spacing hierarchy

| Level     | Spacing       | Examples           |
| --------- | ------------- | ------------------ |
| Atomic    | gap-1, gap-2  | Icon + label       |
| Group     | gap-3, gap-4  | Form fields        |
| Section   | gap-6, mt-6   | Card sections      |
| Component | gap-8, gap-12 | Between components |

### Alignment

Pick one strategy per context:

- **Left**: Default for forms, lists, content
- **Center**: Landing pages, empty states, single-action dialogs only
- **Right**: Header actions, numeric data in tables only
