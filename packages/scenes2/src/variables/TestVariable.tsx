import React, { useContext } from 'react';

import { VariableContext } from './types';

export interface TestVariableProps {
  name: string;
  value: string;
  children: React.ReactNode;
}

export function TestVariable({ name, value, children }: TestVariableProps) {
  const context = useContext(VariableContext);
  const ctx = {
    name,
    loading: false,
    error: null,
    getValue: (_?: string) => {
      return value;
    },
    getValueText: (_?: string) => {
      return value;
    },
    parent: context,
  };

  return (
    <VariableContext.Provider value={ctx}>{children}</VariableContext.Provider>
  );
}
