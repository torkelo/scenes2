import { createContext } from 'react';
import type { VariableType } from '@grafana/data';

export type VariableValue = VariableValueSingle | VariableValueSingle[];
export type VariableValueSingle = string | boolean | number | null;

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
  value: VariableValue;
  loading?: boolean;
  error?: Error | null;
  getValue(fieldPath?: string): VariableValue | undefined | null;
  changeValueTo(value: VariableValue): void;
  setLoading?(loading: boolean): void;
  setError?(error: Error | null): void;
  parent?: VariableContextState;
}

export const VariableContext = createContext<VariableContextState | undefined>(
  undefined,
);

/**
 * Used in CustomFormatterFn
 */
export interface CustomFormatterVariable {
  name: string;
  type: VariableType;
  multi?: boolean;
  includeAll?: boolean;
}

export type VariableCustomFormatterFn = (
  value: unknown,
  legacyVariableModel: Partial<CustomFormatterVariable>,
  legacyDefaultFormatter?: VariableCustomFormatterFn,
) => string;

export type InterpolationFormatParameter =
  string | VariableCustomFormatterFn | undefined;
