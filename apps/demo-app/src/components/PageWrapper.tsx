import { PluginPage } from '@grafana/runtime';
import { TimeRangeContextPicker, TimeRangeRefresh } from '@grafana/scenes2';
import React from 'react';

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  const actions = (
    <>
      <TimeRangeContextPicker />
      <TimeRangeRefresh />
    </>
  );

  return <PluginPage actions={actions}>{children}</PluginPage>;
}
