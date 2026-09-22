import React from 'react';
import type { AdHocVariableFilter, MetricFindValue } from '@grafana/data';
import type { DataSourceRef } from '@grafana/schema';

export type FilterOrigin = 'dashboard' | 'scope' | string;

export interface AdHocFilterWithLabels<
  M extends Record<string, unknown> = Record<string, unknown>,
> extends AdHocVariableFilter {
  keyLabel?: string;
  valueLabels?: string[];
  // this is used to externally trigger edit mode in combobox filter UI
  forceEdit?: boolean;
  // hide the filter from AdHocFiltersVariableRenderer and the URL
  hidden?: boolean;
  meta?: M;
  // filter origin, it can be either scopes, dashboards or undefined,
  // which means it won't appear in the UI
  origin?: FilterOrigin;
  // whether this is basically a cancelled filter through filter-key =~ .*
  matchAllFilter?: boolean;
  // whether this specific filter is read-only and cannot be edited
  readOnly?: boolean;
  // whether this specific filter is restorable to some value from _originalValues
  restorable?: boolean;
  // sets this filter as non-applicable
  nonApplicable?: boolean;
  // reason with reason for nonApplicable filters
  nonApplicableReason?: string;
}

export interface AdhocFiltersContextState {
  filters: AdHocFilterWithLabels[];
  /** Base filters to always apply when looking up keys*/
  baseFilters?: AdHocFilterWithLabels[];
  /** Filters originated from a source */
  originFilters?: AdHocFilterWithLabels[];
  /** Datasource to use for getTagKeys and getTagValues and also controls which scene queries the filters should apply to */
  datasource?: DataSourceRef | null;
}

export const AdhocFiltersContext =
  React.createContext<AdhocFiltersContextState | null>(null);

export type OperatorDefinition = {
  value: string;
  description?: string;
  isMulti?: boolean;
  isRegex?: boolean;
};

export type LabelNamesProvider = (
  state: AdhocFiltersContextState,
  currentKey: string | null,
  operators?: OperatorDefinition[],
) => Promise<{ replace?: boolean; values: MetricFindValue[] }>;

export type LabelValuesProvider = (
  state: AdhocFiltersContextState,
  filter: AdHocFilterWithLabels,
) => Promise<{ replace?: boolean; values: MetricFindValue[] }>;

export interface AdhocFiltersProviderProps {
  children: React.ReactNode;
}

export function AdhocFiltersProvider(props: AdhocFiltersProviderProps) {
  const contextValue: AdhocFiltersContextState = {
    filters: [],
  };

  return (
    <AdhocFiltersContext.Provider value={contextValue}>
      {props.children}
    </AdhocFiltersContext.Provider>
  );
}
