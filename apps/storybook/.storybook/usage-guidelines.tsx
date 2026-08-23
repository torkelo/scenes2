import type { Decorator } from '@storybook/react';
import { addons, useEffect } from 'storybook/preview-api';

import { EVENT_RESULT, type UsageResult } from './usage-guidelines.constants';

// Lazy raw imports of every component USAGE.md, so the docs stay out of the main
// preview bundle. `**` reaches the nested `components/src/components/*` layout as
// well as the flat `base-ui`/`ai-elements` one. Keys are relative to this file.
const docs = import.meta.glob('../../../packages/*/src/**/USAGE.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// A USAGE.md and its sibling *.stories file share a directory, but the glob keys
// (relative to .storybook/) and `parameters.fileName` (relative to the Vite root)
// carry different prefixes — reduce both to their `packages/…/` directory so they
// match regardless of prefix or nesting depth.
const dirKey = (p: string): string | undefined =>
  p.match(/packages\/.*\//)?.[0];

const docByDir = new Map<string, () => Promise<string>>();
for (const [file, load] of Object.entries(docs)) {
  const key = dirKey(file);
  if (key) docByDir.set(key, load);
}

// Drop the leading YAML frontmatter block (design-catalog metadata).
const stripFrontmatter = (md: string): string =>
  md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trimStart();

// On each story render, resolve the story's sibling USAGE.md and emit it (or null)
// to the manager panel. The storyId lets the panel discard stale results when the
// user switches stories faster than the lazy import resolves.
export const withUsageGuidelines: Decorator = (Story, context) => {
  const storyId = context.id;
  const fileName =
    typeof context.parameters.fileName === 'string'
      ? context.parameters.fileName
      : undefined;

  useEffect(() => {
    const channel = addons.getChannel();
    const key = fileName ? dirKey(fileName) : undefined;
    const load = key ? docByDir.get(key) : undefined;

    if (!load) {
      channel.emit(EVENT_RESULT, {
        storyId,
        markdown: null,
      } satisfies UsageResult);
      return;
    }

    let cancelled = false;
    void load().then((raw) => {
      if (!cancelled) {
        channel.emit(EVENT_RESULT, {
          storyId,
          markdown: stripFrontmatter(raw),
        } satisfies UsageResult);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storyId, fileName]);

  return <Story />;
};
