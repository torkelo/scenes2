import React, { useContext, useEffect } from 'react';

import { queryMetricTree } from './metricTree';
import {
  VariableContext,
  type VariableContextState,
  type VariableValue,
} from './types';

export interface TestVariableProps {
  name: string;
  value: string;
  query?: string;
  delay?: number;
  children: React.ReactNode;
}

export function TestVariable({
  name,
  value,
  children,
  delay,
  query,
}: TestVariableProps) {
  const parentContext = useContext(VariableContext);
  const context = useVariableContextState({
    name,
    value,
    loading: query ? true : false,
    parent: parentContext,
  });

  useEffect(() => {
    if (!query) {
      return;
    }

    const cancel = setTimeout(() => {
      const nodes = queryMetricTree(query || '');

      if (nodes.length > 0) {
        context.changeValueTo(nodes[0].name);
      }
    }, delay || 0);

    return () => {
      clearTimeout(cancel);
    };
  }, [query, delay]);

  return (
    <VariableContext.Provider value={context}>
      {children}
    </VariableContext.Provider>
  );
}

interface VariableValueStateInput {
  name: string;
  value: VariableValue;
  loading?: boolean;
  parent?: VariableContextState;
}

function useVariableContextState(
  input: VariableValueStateInput,
): VariableContextState {
  const [loading, setLoading] = React.useState(input.loading);
  const [value, setValue] = React.useState<VariableValue>(input.value);
  const [error, setError] = React.useState<Error | null>(null);

  return {
    name: input.name,
    value: value,
    loading,
    error,
    getValue: (_?: string) => {
      return value;
    },
    getValueText: (_?: string) => {
      return String(value);
    },
    changeValueTo: (newValue: VariableValue) => {
      setValue(newValue);
    },
    setLoading,
    setError,
    parent: input.parent,
  };
}
