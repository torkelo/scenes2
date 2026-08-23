/** @jsxRuntime classic */
// Storybook's manager builder compiles JSX with the classic runtime
// (React.createElement), unlike the Vite-built preview side (automatic runtime).
// The pragma pins this file to that same classic transform so `React` is genuinely
// referenced here — otherwise the repo-wide `jsx: react-jsx` would flag the import
// as unused (noUnusedLocals) even though the manager bundle needs it at runtime.
import Markdown from 'markdown-to-jsx';
import React, { useState } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import {
  addons,
  types,
  useChannel,
  useStorybookApi,
} from 'storybook/manager-api';
import { create, styled } from 'storybook/theming';

import {
  ADDON_ID,
  EVENT_RESULT,
  PANEL_ID,
  type UsageResult,
} from './usage-guidelines.constants';

addons.setConfig({
  theme: create({
    base: 'dark',
    brandTitle: '@grafana/design',
  }),
});

const Content = styled.div(({ theme }) => ({
  padding: '1rem 1.25rem',
  color: theme.color.defaultText,
  fontSize: theme.typography.size.s2,
  lineHeight: 1.5,
  '& h1': { fontSize: theme.typography.size.m1, margin: '0 0 0.5em' },
  '& h2, & h3': {
    fontSize: theme.typography.size.s3,
    margin: '1.25em 0 0.4em',
  },
  '& p, & ul, & ol': { margin: '0 0 0.75em' },
  '& ul, & ol': { paddingLeft: '1.25em' },
  '& li': { margin: '0.15em 0' },
  '& code': {
    fontFamily: theme.typography.fonts.mono,
    fontSize: '0.9em',
    background: theme.background.hoverable,
    padding: '1px 4px',
    borderRadius: 3,
  },
  '& pre': {
    background: theme.background.hoverable,
    padding: '0.75em',
    borderRadius: 4,
    overflow: 'auto',
  },
  '& pre code': { background: 'none', padding: 0 },
  '& a': { color: theme.color.secondary },
}));

const Empty = styled.div(({ theme }) => ({
  padding: '1rem 1.25rem',
  color: theme.textMutedColor,
  fontStyle: 'italic',
}));

const UsagePanel = () => {
  const api = useStorybookApi();
  const [result, setResult] = useState<UsageResult | null>(null);
  useChannel({
    [EVENT_RESULT]: (payload: UsageResult) => setResult(payload),
  });

  // Only render a result that matches the selected story, so a slow lazy import
  // for a previous story can't paint the wrong component's doc.
  const current = api.getCurrentStoryData();
  const markdown =
    result && current && result.storyId === current.id ? result.markdown : null;

  if (!markdown) {
    return <Empty>No usage guidelines for this component.</Empty>;
  }
  return (
    <Content>
      <Markdown>{markdown}</Markdown>
    </Content>
  );
};

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Usage Guidelines',
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => (
      <AddonPanel active={!!active}>
        <UsagePanel />
      </AddonPanel>
    ),
  });
});
