import React, { useContext } from 'react';

import {
  VariableContext,
  type VariableValue,
  type VariableContextState,
  type VariableValueOption,
} from './types';

export interface DefineVariableProps {
  name: string;
  value?: VariableValue;
  loading?: boolean;
  children: React.ReactNode;
}

export function DefineVariable({
  name,
  value,
  loading,
  children,
}: DefineVariableProps) {
  const parentContext = useContext(VariableContext);
  const context = useVariableContextState({
    name,
    value: value ?? {},
    loading: loading,
    parent: parentContext,
  });

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
  parent?: VariableContextState<unknown>;
}

function useVariableContextState(
  input: VariableValueStateInput,
): VariableContextState<VariableValue> {
  const [loading, setLoading] = React.useState(input.loading);
  const [value, setValue] = React.useState<VariableValue>(input.value);
  const [error, setError] = React.useState<Error | null>(null);
  const [options, setOptions] = React.useState<VariableValueOption[]>([]);

  return React.useMemo(
    () => ({
      name: input.name,
      value,
      loading,
      error,
      options,
      getValue: (fieldPath?: string) => {
        if (fieldPath === 'text') {
          return value.label;
        }

        return value.value;
      },
      onChange: setValue,
      onOptionsChange: setOptions,
      onSetLoading: setLoading,
      onSetError: setError,
      parent: input.parent,
    }),
    [input.name, value, loading, error, options, input.parent],
  );
}
