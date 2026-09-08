import { createContext } from 'react';
import type { VariableType } from '@grafana/data';

export type VariableValue = {
  label?: string;
  value?: string | number | boolean;
  properties?: Record<string, unknown>;
};

export interface VariableValueOption {
  label: string;
  value: string | number | boolean;
  properties?: Record<string, unknown>;
  group?: string;
}

export interface VariableContextState<T = unknown> {
  name: string;
  value: T;
  options?: VariableValueOption[];
  loading?: boolean;
  error?: Error | null;
  parent?: VariableContextState<unknown> | undefined;
  getValue(fieldPath?: string): unknown;
  onOptionsChange(options: VariableValueOption[]): void;
  onChange(value: T): void;
  onSetLoading(loading: boolean): void;
  onSetError(error: Error | null): void;
}

export const VariableContext = createContext<
  VariableContextState<unknown> | undefined
>(undefined);

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
