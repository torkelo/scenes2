import { createContext } from 'react';
import type { VariableType } from '@grafana/data';

export type VariableValueSingle = {
  label: string;
  value: string | number | boolean | object | null | undefined;
};

export type VariableValue = VariableValueSingle | VariableValueSingle[];
export interface VariableValueOption {
  label: string;
  value: VariableValueSingle;
  properties: Record<string, unknown>;
  group?: string;
}

export interface VariableContextState<T> {
  name: string;
  value: T;
  loading?: boolean;
  error?: Error | null;
  getValue(fieldPath?: string): unknown;
  changeValueTo(value: T): void;
  setLoading?(loading: boolean): void;
  setError?(error: Error | null): void;
  parent?: VariableContextState<unknown>;
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
