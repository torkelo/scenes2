import React from 'react';
import { createContext } from 'react';
import type { VariableType } from '@grafana/data';

export type VariableValue = VariableValueSingle | VariableValueSingle[];

export type VariableValueSingle = string | boolean | number;

export interface SceneVariable {
  type: VariableType;
  name: string;
  label?: string;
  skipUrlSync?: boolean;
  loading?: boolean;
  error?: Error | null;
  description?: string | null;
  showInControlsMenu?: boolean;
}

export interface VariableContextState {
  name: string;
  loading?: boolean;
  error?: Error | null;
  getValue(fieldPath?: string): VariableValue | undefined | null;
  getValueText(fieldPath?: string): string;
  parent?: VariableContextState;
}

export const VariableContext = createContext<VariableContextState | undefined>(
  undefined,
);

export function useVariable(name: string) {
  let context = React.useContext(VariableContext);

  if (!context) {
    throw new Error(
      'useVariable must be used within a VariableContext.Provider',
    );
  }

  while (context) {
    if (context.name === name) {
      return context;
    }
    context = context.parent;
  }

  return context;
}
