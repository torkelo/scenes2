---
description: 'Conic gradients: first and last color stops must match so the 360° wheel has no seam; repeat the opening color as the final stop. Terms: conic-gradient, color stops, oklch, seam, color wheel.'
---

# Gradients

Close a `conic-gradient` so the full turn blends instead of cutting at 0°.

## Close the conic loop

A `conic-gradient` sweeps 360° and composites its last stop directly against its first. **The first and last stop must be the same color** — otherwise the join is a hard seam at 0°.

### Wrong — seam at 0°

The last stop differs from the first, so the wheel wraps with a visible cut:

```ts
import { getDesignTokens } from '@grafana/design-tokens';

const {
  primitives: { colors },
} = getDesignTokens();

// orange at 0° … fuchsia at the wrap → hard seam
const wheel = `conic-gradient(in oklch, ${colors.orange[500]}, ${colors.fuchsia[500]})`;
```

### Right — repeat the first color

Repeat the first stop's color as the final stop:

```ts
import { getDesignTokens } from '@grafana/design-tokens';

const {
  primitives: { colors },
} = getDesignTokens();

const wheel = `conic-gradient(in oklch, ${colors.orange[500]}, ${colors.fuchsia[500]}, ${colors.orange[500]})`;
```

| Stop order                            | Result         |
| ------------------------------------- | -------------- |
| First color repeated as the last stop | Seamless wheel |
| Last color different from the first   | Hard cut at 0° |

The browser does not blend the wrap on its own. The repeated first-color stop is what closes the loop.

Which hues to pick is in [Color](design/color.md) (`get_styling_doc({ name: 'design-color' })`).

From [grafana-assistant-app#8118](https://github.com/grafana/grafana-assistant-app/pull/8118) review.
