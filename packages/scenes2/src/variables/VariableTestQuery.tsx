import { useEffect } from 'react';

import { useVariable } from '../hooks/useVariable';
import { queryMetricTree } from './metricTree';
import type { VariableValue } from './types';

export interface Props {
  name: string;
  query: string;
  delay?: number;
}

export function VariableTestQuery({ name, query, delay }: Props) {
  useVariableTestQuery(name, query, delay);
  return null;
}

export function useVariableTestQuery(
  name: string,
  query: string,
  delay?: number,
) {
  const { onChange, onSetLoading, onOptionsChange } =
    useVariable<VariableValue>(name);

  useEffect(() => {
    const cancel = setTimeout(() => {
      const nodes = queryMetricTree(query || '');

      if (nodes.length > 0) {
        onChange({ value: nodes[0].name, label: nodes[0].name });
        onOptionsChange(
          nodes.map((node) => ({ value: node.name, label: node.name })),
        );
        onSetLoading(false);
      }
    }, delay || 0);

    return () => {
      clearTimeout(cancel);
    };
  }, [query, delay, onChange, onSetLoading, onOptionsChange]);
}
