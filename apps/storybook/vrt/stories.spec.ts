import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * One screenshot test per (story, mode) for the component packages —
 * @grafana/base-ui, @grafana/ai-elements, and @grafana/components. Stories are
 * enumerated from the built Storybook index so the suite always tracks the real
 * story set without manual maintenance. Every story in those packages is captured
 * in light and dark, except the Icon Gallery (a full icon grid) and the animated
 * stories in SKIP_IDS.
 */

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  importPath?: string;
  type?: 'story' | 'docs';
}

// The component packages under VRT, keyed off each story's source path rather than
// its title so a mis-grouped title can't silently drop a story and unrelated
// packages' stories aren't pulled in.
const VRT_PACKAGE_PATHS = [
  'packages/base-ui/src/',
  'packages/ai-elements/src/',
  'packages/components/src/',
  'vrt/sentinel.stories',
];

// The canvas sentinel runs in every VRT pass, scoped or not: it exists to trip
// on global inputs (canvas color, surface tokens) that per-package scoping
// deliberately doesn't attribute to any package.
const ALWAYS_RUN_STORY_PATHS = ['vrt/sentinel.stories'];

// The Icon Gallery renders the entire icon set as one grid — it exercises the
// gallery, not a component, and would churn on every icon addition. Excluded by
// source path so a title change (e.g. Components/ → Icon/) can't re-include it.
const EXCLUDED_STORY_PATHS = ['/IconGallery/'];

// Optional CI scoping: when the workflow determines only some packages are
// affected by a PR, it sets VRT_SCOPE_PATHS to those packages' importPath
// prefixes (comma-separated) and only their stories are screenshotted. Empty or
// unset runs the full suite (main, nightly, dispatch). See scope.mjs.
const SCOPE_PATHS = (process.env.VRT_SCOPE_PATHS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function loadStories(): StoryEntry[] {
  const staticDir = resolve(here, '../storybook-static');
  // Storybook 8+ emits index.json; older versions emit stories.json.
  let raw: string;
  try {
    raw = readFileSync(resolve(staticDir, 'index.json'), 'utf8');
  } catch {
    raw = readFileSync(resolve(staticDir, 'stories.json'), 'utf8');
  }
  const parsed = JSON.parse(raw) as {
    entries?: Record<string, StoryEntry>;
    stories?: Record<string, StoryEntry>;
  };
  const entries = parsed.entries ?? parsed.stories ?? {};
  return Object.values(entries)
    .filter((e) => (e.type ?? 'story') === 'story')
    .filter((e) =>
      VRT_PACKAGE_PATHS.some((p) => e.importPath?.includes(p) ?? false),
    )
    .filter(
      (e) =>
        !EXCLUDED_STORY_PATHS.some((p) => e.importPath?.includes(p) ?? false),
    )
    .filter(
      (e) =>
        SCOPE_PATHS.length === 0 ||
        SCOPE_PATHS.some((p) => e.importPath?.includes(p) ?? false) ||
        ALWAYS_RUN_STORY_PATHS.some((p) => e.importPath?.includes(p) ?? false),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

const stories = loadStories();
const MODES = ['light', 'dark'] as const;

/**
 * Stories driving continuous JS animation (shimmer sweep, streaming text, a
 * spinning glyph) or async xyflow layout never reach a stable frame, so they have
 * no deterministic pixel baseline and are excluded from the diff. The underlying
 * components are still covered by their other, static stories.
 *
 * `workflow-node--default` / `workflow-toolbar--default` render inside an xyflow
 * `<ReactFlow>` whose `fitView` computes its transform from an async container
 * measurement, so positions land a few sub-pixels differently between runs; their
 * styling is covered deterministically by the other flow stories.
 *
 * `base-ui-spinner--default` spins a `Loader2` partial-arc glyph continuously;
 * Playwright snaps it to a different angle between runs. The Spinner's size,
 * stroke, and color are static and covered elsewhere.
 *
 * `shimmer--inline` (another shimmer sweep) and `workflow-edge--animated` (an
 * animated xyflow edge) likewise never settle — they happen to stabilize on fast
 * hardware but not under the slower emulated x86 renderer used to seed the
 * canonical baselines, so they have no reliable frame. `checkpoint--with-tooltip`
 * portals a tooltip into `<body>` whose render/position isn't stable across
 * environments (it diverged wholesale arm64→amd64). All stay covered by their
 * components' other, static stories.
 */
const SKIP_IDS = new Set<string>([
  // The whole Shimmer family is a continuous JS-driven sweep with no static
  // story — the two previously-baselined variants only matched by landing on a
  // similar animation phase, and any timing change in the capture flow breaks
  // the coincidence. VRT coverage returns when Shimmer honors
  // prefers-reduced-motion (the harness sets it) and renders a stable frame.
  'ai-elements-chatbot-shimmer--default',
  'ai-elements-chatbot-shimmer--headline',
  'ai-elements-chatbot-shimmer--faster',
  'ai-elements-chatbot-shimmer--inline',
  'ai-elements-chatbot-shimmer--wider-spread',
  'ai-elements-chatbot-plan--streaming',
  'ai-elements-chatbot-reasoning--streaming',
  'ai-elements-chatbot-checkpoint--with-tooltip',
  'ai-elements-workflow-node--default',
  'ai-elements-workflow-toolbar--default',
  'ai-elements-workflow-edge--animated',
  'base-ui-spinner--default',
]);

// Pin time + randomness so stories that render `new Date()` / `Math.random()`
// produce identical pixels across the baseline run and every comparison run, and
// fake the audio-input devices the base-ui / ai-elements mic/voice components query.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const FIXED = new Date('2025-01-01T12:00:00Z').getTime();
    const RealDate = Date;
    class FixedDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) {
          super(FIXED);
        } else {
          // @ts-expect-error forward constructor args
          super(...args);
        }
      }
      static now() {
        return FIXED;
      }
    }
    // @ts-expect-error override global Date
    globalThis.Date = FixedDate;

    // Low 32 bits of the xorshift seed (JS bitwise ops are 32-bit, so this is
    // the effective seed — kept exact to avoid float precision loss).
    let seed = 0x4f6cdd1d;
    Math.random = () => {
      seed ^= seed << 13;
      seed ^= seed >> 7;
      seed ^= seed << 17;
      return ((seed >>> 0) % 1_000_000) / 1_000_000;
    };

    // Deterministic audio-input devices for the mic/voice components. Real
    // `enumerateDevices()` / `getUserMedia()` depend on the host's hardware, the
    // permission prompt, and async resolution timing, so the open device list
    // never reaches a stable frame headless. Return a fixed list and a no-op stream.
    const fakeAudioInputs = [
      {
        deviceId: 'default',
        groupId: 'group-default',
        kind: 'audioinput',
        label: 'Default - Built-in Microphone',
      },
      {
        deviceId: 'usb-mic',
        groupId: 'group-usb',
        kind: 'audioinput',
        label: 'External USB Microphone',
      },
    ];
    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
    if (mediaDevices) {
      mediaDevices.enumerateDevices = async () =>
        fakeAudioInputs as unknown as MediaDeviceInfo[];
      mediaDevices.getUserMedia = async () =>
        ({ getTracks: () => [] }) as unknown as MediaStream;
    }
  });
});

for (const story of stories) {
  for (const mode of MODES) {
    const declare = SKIP_IDS.has(story.id) ? test.skip : test;
    declare(`${story.title} · ${story.name} [${mode}]`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story&globals=theme:${mode}`,
      );

      await page.locator('#storybook-root').waitFor({ state: 'attached' });
      await page.waitForLoadState('networkidle');
      // `document.fonts.ready` only covers faces requested before the check, and
      // Emotion injects styles after load — on the no-cache static server a face
      // fetched late can land mid-capture and reflow shrink-wrapped text (the
      // Checkpoint stories' image width flipped run-to-run). Force every
      // registered face to load before anything is measured.
      await page.evaluate(() =>
        Promise.all(Array.from(document.fonts, (face) => face.load())),
      );
      await page.evaluate(() => document.fonts.ready);
      // Small settle for late layout (font swap, JS-positioned/measured UI).
      await page.waitForTimeout(250);
      // Then require the story's layout to hold still: two consecutive identical
      // measurements of the story content's boxes, 150ms apart (capped at 3s).
      // Measure the same surfaces the clip below captures — not just the wrapper's
      // children but also fixed/sticky content and body portals, plus their
      // descendants. A fixed container (Sonner's toast stack, a dialog) keeps a
      // static rect while JS-driven transforms still shuffle its contents, so
      // measuring only the top-level boxes signs off mid-animation.
      await page.evaluate(async () => {
        const boxes = () => {
          const els: Element[] = [];
          const wrapper =
            document.querySelector('#storybook-root')?.firstElementChild;
          if (wrapper) {
            els.push(...Array.from(wrapper.children));
            for (const el of Array.from(wrapper.querySelectorAll('*'))) {
              const cs = getComputedStyle(el);
              if (cs.position === 'fixed' || cs.position === 'sticky') {
                els.push(el, ...Array.from(el.querySelectorAll('*')));
              }
            }
          }
          for (const el of Array.from(document.body.children)) {
            if (
              el.id === 'storybook-root' ||
              el.tagName === 'SCRIPT' ||
              el.tagName === 'STYLE'
            ) {
              continue;
            }
            els.push(el, ...Array.from(el.querySelectorAll('*')));
          }
          return JSON.stringify(
            els.map((el) => el.getBoundingClientRect().toJSON()),
          );
        };
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        let prev = boxes();
        for (let i = 0; i < 20; i++) {
          await sleep(150);
          const cur = boxes();
          if (cur === prev) return;
          prev = cur;
        }
      });

      // Clip to the component, not the whole canvas. Union the bounding boxes of
      // the decorator wrapper's children (the story content) with any popups
      // base-ui portals into document.body (Dialog, Select, Popover, Command, …)
      // so an open popup / its backdrop is captured without the surrounding
      // centering whitespace. A fixed BLEED margin is added on every side so
      // effects that paint outside the layout box — box-shadow edges, focus rings,
      // drop shadows — aren't cropped at the boundary. The rect is clamped to the
      // viewport.
      const BLEED = 20;
      const clip = await page.evaluate((bleed) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const rects: DOMRect[] = [];
        const consider = (el: Element) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) rects.push(r);
        };
        const wrapper =
          document.querySelector('#storybook-root')?.firstElementChild;
        if (wrapper) {
          for (const child of Array.from(wrapper.children)) consider(child);
          // A `position: fixed`/`sticky` descendant (e.g. the desktop Sidebar's
          // fixed panel) is anchored to the viewport, not the padded decorator
          // wrapper, so its box can fall outside wrapper.children — measure those
          // explicitly. Skip visually-hidden helpers: base-ui renders each native
          // form control as a fixed, 1px, `clip: inset(50%)` element pinned to a
          // viewport corner, which would otherwise inflate the clip.
          for (const el of Array.from(wrapper.querySelectorAll('*'))) {
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
            const clipHint = `${cs.clipPath} ${cs.clip}`;
            if (clipHint.includes('inset(50%') || clipHint.includes('rect(0')) {
              continue;
            }
            consider(el);
          }
        }
        for (const el of Array.from(document.body.children)) {
          if (
            el.id === 'storybook-root' ||
            el.tagName === 'SCRIPT' ||
            el.tagName === 'STYLE'
          ) {
            continue;
          }
          // base-ui portal wrappers are often zero-size; recurse so the actual
          // popup (and its backdrop, if any) is measured.
          consider(el);
          for (const d of Array.from(el.querySelectorAll('*'))) consider(d);
        }
        if (!rects.length) return null;
        // Expand the union rect outward by `bleed` on each side, then clamp to the
        // viewport so the clip never runs off-canvas.
        const left = Math.max(
          0,
          Math.floor(Math.min(...rects.map((r) => r.left))) - bleed,
        );
        const top = Math.max(
          0,
          Math.floor(Math.min(...rects.map((r) => r.top))) - bleed,
        );
        const right = Math.min(
          vw,
          Math.ceil(Math.max(...rects.map((r) => r.right))) + bleed,
        );
        const bottom = Math.min(
          vh,
          Math.ceil(Math.max(...rects.map((r) => r.bottom))) + bleed,
        );
        return {
          x: left,
          y: top,
          width: Math.max(1, right - left),
          height: Math.max(1, bottom - top),
        };
      }, BLEED);

      // Fall back to a full-page capture when nothing rendered — an empty render
      // is itself a regression worth diffing.
      await expect(page).toHaveScreenshot(
        `${story.id}-${mode}.png`,
        clip ? { clip } : { fullPage: true },
      );
    });
  }
}
