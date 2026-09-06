# Content

Prose styling, images, code blocks, and empty states.

---

## Prose styling

### Measure and rhythm

- Max width: ~65 characters for comfortable reading
- Line height: 1.6-1.7 for body text
- Paragraph spacing: one line of text between paragraphs

```jsx
className = 'max-w-prose leading-relaxed';
```

### Headings in prose

Headings use heavier weight for contrast with body text. Space above is greater than below (headings belong to what follows):

```jsx
// Heading
className = 'mt-48 mb-16 text-2xl font-semibold';

// Paragraph
className = 'mb-16';
```

### Font weights in prose

- Body: `font-normal` (400)
- Headings: `font-semibold` (600)
- Strong emphasis: `font-semibold` (600), used sparingly

---

## Images

### Sizing approach

Size images within prose for their content rather than forcing them into arbitrary layouts. Determine width by:

- The image's natural aspect ratio
- The content it's illustrating
- The reading context

For images that benefit from more space than the prose column, use a wider container or dedicated image section, not negative margins.

### Image presentation

- No decorative borders or shadows on images
- Subtle rounded corners (4-8px)
- Caption in tertiary text color, positioned below image

```jsx
<figure>
  <img className="rounded" src="..." alt="..." />
  <figcaption className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
    Caption text
  </figcaption>
</figure>
```

---

## Code blocks

### Styling

- Monospace system font stack
- Subtle background differentiation from prose
- Horizontal scroll for long lines (never wrap code)

```jsx
className="
  font-mono text-sm
  bg-neutral-100 dark:bg-neutral-800
  rounded-lg
  p-16
  overflow-x-auto
"
```

### Syntax highlighting

Keep syntax colors muted. Highlighting shouldn't compete with the accent color or overwhelm the content.

### Inline code

```jsx
className="
  font-mono text-sm
  bg-neutral-100 dark:bg-neutral-800
  px-4 py-1
  rounded
"
```

---

## Empty states

### Atmospheric, not apologetic

Empty states use intentional whitespace. Don't fill emptiness with illustrations or elaborate messaging.

```jsx
// Correct: minimal, atmospheric
<div className="py-96 text-center">
  <p className="text-neutral-400 dark:text-neutral-500">No results found</p>
</div>

// Wrong: elaborate empty state
<div className="py-48">
  <Illustration />
  <h3>Nothing here!</h3>
  <p>Get started by creating your first item...</p>
  <Button>Create Item</Button>
</div>
```

If an action is appropriate, include it simply, but don't force CTAs into every empty state.

### When action is appropriate

When the empty state represents something the user can fix:

```jsx
<div className="py-48 text-center">
  <p className="text-neutral-500 dark:text-neutral-400">
    No items match your filter
  </p>
  <button className="mt-16 text-accent hover:underline">Clear filters</button>
</div>
```

---

## Lists in content

### Unordered lists

- Subtle bullet styling
- Consistent indentation
- Same line height as body text

### Ordered lists

- Numbers in secondary color
- Clear visual separation from content

### Spacing

Items within a list are tightly spaced. Lists themselves have generous spacing from surrounding content.

---

## Blockquotes

```jsx
className="
  border-l-2 border-neutral-300 dark:border-neutral-700
  pl-16
  text-neutral-600 dark:text-neutral-400
  italic
"
```

Keep blockquotes visually distinct but not overwhelming.

---

## Tables in content

- Clear header row distinction
- Adequate cell padding
- Horizontal scroll for wide tables on narrow screens
- Zebra striping optional; use only if it aids scanning

```jsx
className="
  w-full
  text-left
  border-collapse
"

// Header
className="
  border-b border-neutral-200 dark:border-neutral-800
  pb-8
  font-medium
"

// Cell
className="
  py-12 pr-16
  border-b border-neutral-100 dark:border-neutral-800
"
```
