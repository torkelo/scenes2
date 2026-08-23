# Interactions

Hover states, focus, buttons, forms, loading, and error handling.

---

## Philosophy

Micro-interactions should be barely perceptible but deeply satisfying. Users shouldn't consciously notice them; they should feel the interface responds correctly.

---

## Hover states

### Color shift only

No scale. No elevation. No transform. Just a subtle background color change.

```jsx
// Light mode
className = 'hover:bg-neutral-100 transition-colors duration-150';

// Dark mode
className = 'dark:hover:bg-neutral-800 transition-colors duration-150';
```

### Timing

Hover transitions run 150-200ms. Fast enough to feel responsive, slow enough to not feel jarring.

```jsx
className = 'transition-colors duration-150';
// or
className = 'transition-colors duration-200';
```

### Text links

Links shift to accent color on hover:

```jsx
className = 'text-neutral-600 hover:text-accent transition-colors duration-150';
```

### Never use transparent colors

```jsx
// Wrong: transparent hover
className = 'hover:bg-white/5';

// Correct: solid color
className = 'hover:bg-neutral-100 dark:hover:bg-neutral-800';
```

---

## Focus states

### Ring outline

Standard focus indicator: a ring around the element. Clear, conventional, accessible.

```jsx
className =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
```

Use `focus-visible` (not `focus`) to show focus only for keyboard navigation.

---

## Button states

Buttons have three distinct states:

| State    | Treatment                                    |
| -------- | -------------------------------------------- |
| Default  | Solid neutral background, clear label        |
| Hover    | Slightly shifted background color            |
| Disabled | Reduced opacity (50-60%), cursor-not-allowed |

**Active state**: Same as hover. No separate styling needed; maintaining the hover state on press feels natural.

```jsx
className="
  bg-neutral-100 dark:bg-neutral-800
  hover:bg-neutral-200 dark:hover:bg-neutral-700
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors duration-150
"
```

### Button variants

| Variant     | Use              | Styling                                 |
| ----------- | ---------------- | --------------------------------------- |
| Primary     | Main action      | Solid background, high contrast         |
| Secondary   | Alternate action | Lighter background or outline           |
| Ghost       | Tertiary action  | No background, text only                |
| Destructive | Delete, remove   | Red icon indicator (not red background) |

---

## Form inputs

### Base input style

```jsx
className="
  w-full px-12 py-8
  bg-white dark:bg-neutral-900
  border border-neutral-200 dark:border-neutral-700
  rounded-md
  focus:ring-2 focus:ring-accent focus:border-transparent
  transition-colors duration-150
"
```

### Labels

```jsx
className = 'text-sm font-medium text-neutral-700 dark:text-neutral-300';
```

### Helper text

```jsx
className = 'text-sm text-neutral-500 dark:text-neutral-400';
```

---

## Validation

### Validate on blur

Don't interrupt typing. Validate when the user leaves a field.

```jsx
onBlur={(e) => validate(e.target.value)}
```

### Error display

Errors appear below the field. Use a small red icon with neutral-colored text:

```jsx
<div className="flex items-center gap-2 mt-1">
  <ExclamationCircle className="h-4 w-4 text-red-500" />
  <span className="text-sm text-neutral-600 dark:text-neutral-400">
    Please enter a valid email address
  </span>
</div>
```

The field border can shift subtly toward red, but don't make the entire field alarming:

```jsx
className={hasError ? "border-red-300 dark:border-red-800" : "border-neutral-200"}
```

### Error message tone

- Explain what's wrong
- Suggest how to fix it
- No exclamation marks
- No ALL CAPS
- No alarming language

---

## Loading states

### Optimistic UI first

Assume success. Update the UI immediately. Roll back if the operation fails.

```jsx
// User clicks "Save"
// 1. Immediately show saved state
// 2. Send request in background
// 3. Only show error if request fails
```

### Loading boundaries

When you can't be optimistic, use appropriate loading boundaries. The loading indicator should be:

- Local to the content that's loading
- Proportional to what's being loaded
- Non-blocking where possible

```jsx
// Loading a list: skeleton in the list area only
<div className="space-y-2">
  <Skeleton className="h-12" />
  <Skeleton className="h-12" />
  <Skeleton className="h-12" />
</div>

// Loading a button action: indicator in the button
<Button disabled>
  <Spinner className="h-4 w-4" />
  Saving...
</Button>
```

### Skeleton states

Skeletons show the shape of what's coming:

```jsx
className = 'animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded';
```

### Never block everything

A small action shouldn't freeze the whole interface. Loading states are local.

---

## Error states

### Red as indicator, not alarm

Red appears as small icons or subtle border shifts. Never red text. Never red backgrounds.

```jsx
// Correct: small indicator
<ExclamationCircle className="h-4 w-4 text-red-500" />

// Wrong: red text
<span className="text-red-500">Error occurred</span>

// Wrong: red background
<div className="bg-red-100 text-red-800">Error</div>
```

### Error recovery

Always provide a path forward:

- What went wrong (briefly)
- What the user can do about it
- A way to retry or dismiss

---

## Disabled states

Disabled elements reduce to 50-60% opacity. No other visual changes.

```jsx
className = 'disabled:opacity-50 disabled:cursor-not-allowed';
```

Don't remove disabled elements from the layout; their absence is confusing.
