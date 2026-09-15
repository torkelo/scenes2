import { PluginPage } from '@grafana/runtime';
import { TimeRangeContextPicker, TimeRangeRefresh } from '@grafana/scenes2';
import { PLUGIN_BASE_URL } from 'constants';
import React from 'react';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  const actions = (
    <>
      <TimeRangeContextPicker />
      <TimeRangeRefresh />
    </>
  );

  const pageNav = { text: title, parentItem: { text: 'Scenes2 demos', url: PLUGIN_BASE_URL } };

  return (
    <PluginPage pageNav={pageNav} actions={actions}>
      {children}
    </PluginPage>
  );
}
