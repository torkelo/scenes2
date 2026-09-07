import React, { useContext } from 'react';

import { VariableContext, type VariableContextState } from './types';

export interface ObjectVariableProps<T extends object> {
  name: string;
  value: T;
  children: React.ReactNode;
}

export function ObjectVariable<T extends object>({
  name,
  value,
  children,
}: ObjectVariableProps<T>) {
  const parentContext = useContext(VariableContext);
  const context = useVariableContextState({
    name,
    value: { value, label: value },
    loading: false,
    parent: parentContext,
  });

  return (
    <VariableContext.Provider value={context}>
      {children}
    </VariableContext.Provider>
  );
}

interface VariableValueStateInput<T> {
  name: string;
  value: T;
  loading?: boolean;
  parent?: VariableContextState<unknown>;
}

function useVariableContextState<T>(
  input: VariableValueStateInput<T>,
): VariableContextState<T> {
  const [loading, setLoading] = React.useState(input.loading);
  const [value, setValue] = React.useState<T>(input.value);
  const [error, setError] = React.useState<Error | null>(null);

  return {
    name: input.name,
    value: value,
    loading,
    error,
    getValue: (_?: string) => {
      return value;
    },
    changeValueTo: (newValue: T) => {
      setValue(newValue);
    },
    setLoading,
    setError,
    parent: input.parent,
  };
}
