# Grafana Prototype Kit - Agent instructions

Translate designer requests into working Grafana-style prototypes. Designers work at the concept level. Handle implementation details silently. Never ask about implementation choices - make the right decision autonomously.

---

## Silent rules (apply automatically)

1. **Pages in `src/pages/` NEVER include GrafanaFrame** - the router provides it
2. **Always use semantic color tokens** (`bg-canvas`, `text-primary`) - never hex values
3. **Tables flow directly on the page** - no Card wrapper, no outer border
4. **Run `npm run validate` before considering any task complete**
5. **Use `<Select><option>` syntax** - not compound component pattern
6. **Breadcrumbs are in GrafanaFrame** - don't add them inside pages
7. **Rename "My Prototype" in the sidebar on first prompt** - derive the name from the user's request (refer to the Sidebar & routing section)
8. **The prototype's main page IS the homepage (`/`)** - never create route prefixes like `/fleet-manager/...`

---

## Prototype interactivity (required)

Prototypes must be interactive, testable, and usable - not static representations.

**Core requirements:**

- All actions must have real consequences - buttons should do something
- Add/edit/delete operations must actually modify visible state
- Forms should update data when submitted
- Search and filters should actually filter displayed content

**State management is your responsibility:**

- Use React `useState` for component-local state
- Use Zustand stores (in `src/stores/`) when state needs to be shared across pages
- Choose the appropriate pattern for the prototype's needs
- Never leave stub handlers like `// In a real app...`

**What "working state" means:**

- Changes persist for the session (until page refresh)
- You don't need localStorage persistence unless specifically requested
- The prototype should feel like a real application

**Why this matters:**

Static mockups don't validate workflows. Designers need to interact with prototypes to understand if the UX makes sense. A pixel-perfect UI with non-functional buttons provides no useful signal.

---

## Sidebar & routing (automatic setup)

On your **first prompt**, automatically rename the "My Prototype" sidebar section based on what the user is building. Do not wait to be asked.

### Naming the prototype

Derive a short, descriptive name from the user's request:

- User says "build a fleet management dashboard" → Name it "Fleet Manager"
- User says "I need a service catalog" → Name it "Service Catalog"
- User says "cost monitoring app" → Name it "Cost Monitor"

### Routing rules

**The prototype's main page IS the homepage (`/`).** Replace `HomePage.tsx` with your prototype content.

Routes must be root-level paths:

- ✅ `/` - prototype main page
- ✅ `/settings` - settings page
- ✅ `/details/:id` - detail view
- ❌ `/fleet-manager/` - never prefix routes with the prototype name
- ❌ `/fleet-manager/settings` - wrong

### Setup steps (first prompt)

1. **Rename the sidebar label** in `src/layouts/GrafanaFrame/navData.ts`:

```tsx
{
  id: "my-prototype",
  label: "Fleet Manager",  // ← Derived from user request
  icon: "server",          // ← Choose appropriate icon
  children: [
    { id: "fleet-overview", label: "Overview" },
    { id: "fleet-settings", label: "Settings" },
  ],
}
```

2. **Update breadcrumbs** in `App.tsx`:

```tsx
<GrafanaFrame breadcrumbs={[{ label: "Fleet Manager" }]} ...>
```

3. **Replace `HomePage.tsx`** with your prototype's main page content

4. **Map routes to nav IDs** in `App.tsx` for sidebar highlighting:

```tsx
const getActiveNavId = () => {
  if (location.pathname === '/') return 'fleet-overview';
  if (location.pathname === '/settings') return 'fleet-settings';
  return 'my-prototype';
};
```

### Available icons

`cube`, `server`, `database`, `cloud`, `apps`, `folder`, `graph-bar`, `chart-line`, `shield`, `users`, `cog`, `layers`, `file-alt`, `heart-rate`, `bell`, `link`

---

## External tools

### Agent Browser CLI

Browser automation CLI from [Vercel](https://github.com/vercel-labs/agent-browser). Uses ~93% fewer tokens than traditional browser automation.

**Installation:** `npm install -g agent-browser && agent-browser install`

**Workflow:**

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get element refs (@e1, @e2)
3. `agent-browser click @e1` / `agent-browser fill @e2 "text"` - Interact
4. Re-snapshot after page changes

**Key commands:** `open`, `snapshot`, `click`, `fill`, `type`, `screenshot`

---

## MCP servers

Pre-configured in `.cursor/mcp.json`.

| Server  | Purpose                               | Requirement                             |
| ------- | ------------------------------------- | --------------------------------------- |
| `figma` | Fetch design context from Figma files | Figma Desktop app with Dev Mode enabled |

### Figma MCP (local server)

Fetches structured design context from Figma files. Requires:

1. Figma Desktop app running
2. Dev Mode enabled in the file
3. MCP server toggle enabled (in Dev Mode settings)

The local server runs at `http://127.0.0.1:3845/mcp`.

**Key tools:** `get_design_context`

---

## When building a page

1. Create file in `src/pages/YourPage.tsx`
2. Import `PageLayout` from `../layouts/PageLayout`
3. Use this structure (NO GrafanaFrame):

```tsx
import { PageLayout } from '../layouts/PageLayout';
import { Button, Badge, Card, Typography } from '../components';

export function YourPage() {
  return (
    <PageLayout>
      <PageLayout.Header>
        <PageLayout.Title description="Optional subtitle">
          Page Title
        </PageLayout.Title>
        <PageLayout.Actions>
          <Button variant="primary">Action</Button>
        </PageLayout.Actions>
      </PageLayout.Header>
      <PageLayout.Content>{/* Your content here */}</PageLayout.Content>
    </PageLayout>
  );
}
```

4. Add route to `App.tsx` inside the `GrafanaLayout` route group
5. Run `npm run validate`

**Reference:** Refer to `src/pages/ServiceOverviewPage.tsx` for a complete example.

---

## Component selection

When designer says → Use this:

| Designer Language                                               | Use This                       |
| --------------------------------------------------------------- | ------------------------------ |
| dropdown, select, picker                                        | `Select`                       |
| searchable dropdown, autocomplete                               | `Combobox`                     |
| toggle, switch, on/off                                          | `Switch`                       |
| popup, dialog, modal, lightbox                                  | `Modal`                        |
| confirmation dialog                                             | `ConfirmModal`                 |
| side panel, drawer, sheet                                       | `Drawer`                       |
| toast, notification                                             | `Alert` (position fixed)       |
| status indicator with auto color (healthy/active/degraded/down) | `StatusBadge` (from Presets)   |
| severity badge with auto color (critical/warning/info)          | `SeverityBadge` (from Presets) |
| generic badge with manual color                                 | `Badge` with `color` prop      |
| tag, label, chip                                                | `Tag`                          |
| tabs, tab bar                                                   | `Tabs`                         |
| action menu, context menu                                       | `DropdownMenu`                 |
| stats, metrics, KPIs                                            | `StatCardRow` (from Presets)   |
| metadata, key-value pairs                                       | `MetadataGrid` (from Presets)  |
| incidents, events list                                          | `IncidentTable` (from Presets) |

---

## Page type selection

Determine the page type from the request, then use the appropriate pattern:

| If building...                              | Use this pattern             | Variant     |
| ------------------------------------------- | ---------------------------- | ----------- |
| Dashboard with metrics/charts/time controls | `DashboardTemplate` patterns | `dashboard` |
| List or table with search/filters           | `ListTemplate` patterns      | `page`      |
| Settings or configuration form              | `SettingsTemplate` patterns  | `page`      |
| Detail view of single entity                | `DetailTemplate` patterns    | `page`      |
| Multi-step wizard or complex form           | `FormTemplate` patterns      | `page`      |

Import the **Content** component from templates (e.g., `DetailContent`), not the full template.

---

## Preset components

Use these for common patterns:

### StatCardRow - Metrics display

```tsx
import { StatCardRow } from '../layouts/Presets';

<StatCardRow
  stats={[
    { label: 'Requests/sec', value: '1,234' },
    { label: 'Error Rate', value: '0.12%' },
    { label: 'Avg Latency', value: '45ms' },
  ]}
/>;
```

### MetadataGrid - Key-value pairs

```tsx
import { MetadataGrid } from '../layouts/Presets';

<MetadataGrid
  items={[
    { label: 'Host', value: 'prod-db.example.com' },
    { label: 'Port', value: '5432' },
    { label: 'Region', value: 'us-east-1' },
  ]}
  columns={2}
/>;
```

### IncidentTable - Events with severity

```tsx
import { IncidentTable } from '../layouts/Presets';

<IncidentTable
  incidents={[
    {
      severity: 'critical',
      title: 'Database timeout',
      timestamp: '2 hours ago',
    },
    { severity: 'warning', title: 'High memory', timestamp: '5 hours ago' },
  ]}
/>;
```

---

## Styling rules

### Backgrounds (darkest to lightest)

- `bg-canvas` (#111217) - Dashboard background, input fields
- `bg-primary` (#181b1f) - Page background, panels, sidebar
- `bg-secondary` (#22252b) - Cards, modals, elevated surfaces

### Text colors

- `text-primary` - Main text
- `text-secondary` - Subdued text (65% opacity)
- `text-disabled` - Disabled state (42% opacity)

### Status badge colors

- `color="green"` - Success, healthy, active
- `color="orange"` - Warning, pending, degraded
- `color="red"` - Error, critical, down
- `color="blue"` - Info, neutral states

### Tables

- Header: `bg-secondary`, `py-1.5`, `font-normal text-secondary`
- Body rows: `py-2`, `hover:bg-action-subtle`
- No outer border, no header bottom border

---

## Mock data

```tsx
// Generators
import {
  generateIncidents,
  generateMetrics,
  generateUsers,
} from '../lib/mockData';

const incidents = generateIncidents(5);
const metrics = generateMetrics(['CPU', 'Memory', 'Disk']);

// Pre-built data
import { tableRows, teamMembers, sampleEntity } from '../templates/mockData';

// Color mappings
import { severityColors, statusColors } from '../lib/mockData';
```

---

## Card usage rules

**USE cards for:**

- Grouping related metadata on Overview tabs
- Distinct visual sections in multi-column layouts

**DON'T use cards for:**

- Wrapping ALL content on a tab
- Wrapping tables or lists
- Single pieces of content

---

## File structure

```
packages/prototype/
├── docs/                # Documentation
│   ├── VOCABULARY.md    # Page region definitions
│   ├── COMPONENTS.md    # Component aliases and patterns
│   ├── TEMPLATES.md     # Template selection guide
│   └── STYLING.md       # Colors, spacing, styling
├── src/
│   ├── components/      # Component library (import, don't modify)
│   ├── layouts/         # GrafanaFrame, PageLayout, DashboardGrid, Presets
│   ├── templates/       # Copy and customize these
│   │   ├── DashboardTemplate.tsx
│   │   ├── ListTemplate.tsx
│   │   ├── SettingsTemplate.tsx
│   │   ├── DetailTemplate.tsx
│   │   └── FormTemplate.tsx
│   ├── pages/           # Your prototype pages
│   │   └── ServiceOverviewPage.tsx  # Example page
│   ├── stores/          # Zustand state stores
│   ├── lib/             # Utilities, animations, mock data
│   └── index.css        # Tailwind theme with color tokens
└── AGENTS.md            # This file
```

---

## Import patterns

```tsx
// Components (primitives)
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Badge,
  Input,
  Select,
  DropdownMenu,
  Tabs,
  Typography,
  Icon,
} from '../components';

// Layouts
import { PageLayout } from '../layouts/PageLayout';
import { DashboardGrid } from '../layouts/DashboardGrid';

// Presets (convenience wrappers with auto color mapping)
import {
  StatCardRow, // Metrics display
  MetadataGrid, // Key-value pairs
  IncidentTable, // Events with severity badges
  StatusBadge, // status="healthy|degraded|down|active|inactive|pending" → auto color
  SeverityBadge, // severity="critical|warning|info" → auto color
  ServiceHeader, // Title + status badge combo
} from '../layouts/Presets';

// Template content (for reference)
import { DetailContent } from '../templates/DetailTemplate';
import { ListContent } from '../templates/ListTemplate';
```

---

## Detailed documentation

Read these files when you need deeper information:

| Need                          | Read                 |
| ----------------------------- | -------------------- |
| Page region definitions       | `docs/VOCABULARY.md` |
| Full component aliases        | `docs/COMPONENTS.md` |
| Template selection guide      | `docs/TEMPLATES.md`  |
| Complete color/spacing tokens | `docs/STYLING.md`    |

---

## Common patterns

### Variable dropdown (dashboard)

```tsx
<InputGroup>
  <InputGroup.Addon position="start">label</InputGroup.Addon>
  <Select className="w-auto rounded-l-none">
    <option>value</option>
  </Select>
</InputGroup>
```

### Modal

```tsx
<Modal open={open} onClose={() => setOpen(false)}>
  <Modal.Header>
    <Modal.Title>Title</Modal.Title>
  </Modal.Header>
  <Modal.Content>Content</Modal.Content>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary">Save</Button>
  </Modal.Footer>
</Modal>
```

### Toast notification

```tsx
<div className="fixed bottom-4 right-4 z-50">
  <Alert severity="success" onClose={handleClose}>
    Saved successfully!
  </Alert>
</div>
```

---

## Technologies

- React 19 + TypeScript
- Tailwind CSS v4 (semantic color tokens in `@theme`, no default colors)
- React Router v7
- Zustand v5 for state
- Motion v12 for animations (import from `motion/react`)

---

## Validation

**Always run before completing any task:**

```bash
npm run validate
```

Fix any errors. Only share error output if you cannot resolve it.
