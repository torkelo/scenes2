import React, { createContext, useCallback, useMemo, useState } from 'react';
import type { AdHocVariableFilter } from '@grafana/data';
import type { DataSourceRef } from '@grafana/schema';

export interface AdHocFilterWithLabels<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends AdHocVariableFilter {
  keyLabel?: string;
  valueLabels?: string[];
  meta?: M;
}

export interface OperatorDefinition {
  value: string;
  description: string;
}

export const OPERATORS: OperatorDefinition[] = [
  { value: '=', description: 'Equals' },
  { value: '!=', description: 'Not equal' },
  { value: '=~', description: 'Matches regex' },
  { value: '!~', description: 'Does not match regex' },
];

export interface AdhocFiltersContextState {
  filters: AdHocFilterWithLabels[];
  /** Data source to query for tag keys/values, and to apply the filters against. */
  datasource?: DataSourceRef | null;
  onAddFilter(filter: AdHocFilterWithLabels): void;
  onUpdateFilter(
    filter: AdHocFilterWithLabels,
    update: Partial<AdHocFilterWithLabels>,
  ): void;
  onRemoveFilter(filter: AdHocFilterWithLabels): void;
}

export const AdhocFiltersContext =
  createContext<AdhocFiltersContextState | null>(null);

export interface AdhocFiltersProviderProps {
  datasource?: DataSourceRef | null;
  initialFilters?: AdHocFilterWithLabels[];
  children: React.ReactNode;
}

export function AdhocFiltersProvider({
  datasource,
  initialFilters,
  children,
}: AdhocFiltersProviderProps) {
  const [filters, setFilters] = useState<AdHocFilterWithLabels[]>(
    initialFilters ?? [],
  );

  const onAddFilter = useCallback((filter: AdHocFilterWithLabels) => {
    setFilters((prev) => [...prev, filter]);
  }, []);

  const onUpdateFilter = useCallback(
    (filter: AdHocFilterWithLabels, update: Partial<AdHocFilterWithLabels>) => {
      setFilters((prev) =>
        prev.map((f) => (f === filter ? { ...f, ...update } : f)),
      );
    },
    [],
  );

  const onRemoveFilter = useCallback((filter: AdHocFilterWithLabels) => {
    setFilters((prev) => prev.filter((f) => f !== filter));
  }, []);

  const value = useMemo<AdhocFiltersContextState>(
    () => ({
      filters,
      datasource,
      onAddFilter,
      onUpdateFilter,
      onRemoveFilter,
    }),
    [filters, datasource, onAddFilter, onUpdateFilter, onRemoveFilter],
  );

  return (
    <AdhocFiltersContext.Provider value={value}>
      {children}
    </AdhocFiltersContext.Provider>
  );
}
