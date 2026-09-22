import { css } from '@emotion/css';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type {
  GetTagResponse,
  GrafanaTheme2,
  MetricFindValue,
} from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { Combobox, type ComboboxOption, useStyles2 } from '@grafana/ui';

import { useAdhocFilters } from '../hooks/useAdhocFilters';
import { OPERATORS, type AdHocFilterWithLabels } from './AdhocFiltersContext';

type EditorStep = 'key' | 'operator' | 'value';

interface DraftFilter {
  key?: string;
  keyLabel?: string;
  operator?: string;
}

export interface AdHocFilterEditorProps {
  /** The filter being edited. Omit to add a brand new filter. */
  filter?: AdHocFilterWithLabels;
  onDone: () => void;
}

/**
 * Steps through key -> operator -> value for one filter, then commits it in
 * a single update. Used both for the always-present "add filter" slot and,
 * via AdHocFilterPill, for editing an existing filter.
 */
export function AdHocFilterEditor({ filter, onDone }: AdHocFilterEditorProps) {
  const { datasource, onAddFilter, onUpdateFilter } = useAdhocFilters();
  const styles = useStyles2(getStyles);
  const [step, setStep] = useState<EditorStep>(filter ? 'value' : 'key');
  const [draft, setDraft] = useState<DraftFilter>(
    filter
      ? {
          key: filter.key,
          keyLabel: filter.keyLabel,
          operator: filter.operator,
        }
      : {},
  );

  const dsQuery = useQuery({
    queryKey: ['ds', datasource],
    queryFn: () => getDataSourceSrv().get(datasource ?? undefined),
    enabled: datasource != null,
    staleTime: Infinity,
  });

  const keysQuery = useQuery({
    queryKey: ['adhoc-tag-keys', datasource],
    queryFn: async () =>
      normalizeTagResponse(await dsQuery.data?.getTagKeys?.({ filters: [] })),
    enabled: step === 'key' && dsQuery.data != null,
  });

  const valuesQuery = useQuery({
    queryKey: ['adhoc-tag-values', datasource, draft.key],
    queryFn: async () =>
      normalizeTagResponse(
        await dsQuery.data?.getTagValues?.({ key: draft.key!, filters: [] }),
      ),
    enabled: step === 'value' && dsQuery.data != null && draft.key != null,
  });

  const keyOptions = useMemo(() => toOptions(keysQuery.data), [keysQuery.data]);
  const valueOptions = useMemo(
    () => toOptions(valuesQuery.data),
    [valuesQuery.data],
  );
  const operatorOptions = useMemo<Array<ComboboxOption<string>>>(
    () =>
      OPERATORS.map((op) => ({
        value: op.value,
        label: op.value,
        description: op.description,
      })),
    [],
  );

  const commitValue = useCallback(
    (option: ComboboxOption<string>) => {
      const complete: AdHocFilterWithLabels = {
        key: draft.key!,
        keyLabel: draft.keyLabel,
        operator: draft.operator!,
        value: option.value,
        valueLabels: [option.label ?? option.value],
      };

      if (filter) {
        onUpdateFilter(filter, complete);
      } else {
        onAddFilter(complete);
      }

      onDone();
    },
    [draft, filter, onAddFilter, onUpdateFilter, onDone],
  );

  return (
    <div className={styles.row}>
      {step !== 'key' && draft.key && (
        <span className={styles.segment}>{draft.keyLabel ?? draft.key}</span>
      )}
      {step === 'value' && draft.operator && (
        <button
          type="button"
          className={styles.segmentButton}
          onClick={() => setStep('operator')}
        >
          {draft.operator}
        </button>
      )}

      {step === 'key' && (
        <Combobox
          key="key"
          autoFocus
          placeholder="Select label"
          loading={keysQuery.isFetching}
          options={keyOptions}
          value={draft.key ?? null}
          width={16}
          onChange={(option) => {
            setDraft({
              key: option.value,
              keyLabel: option.label ?? option.value,
            });
            setStep('operator');
          }}
        />
      )}

      {step === 'operator' && (
        <Combobox
          key="operator"
          autoFocus
          placeholder="Select operator"
          options={operatorOptions}
          value={draft.operator ?? null}
          width={10}
          onChange={(option) => {
            setDraft((prev) => ({ ...prev, operator: option.value }));
            setStep('value');
          }}
        />
      )}

      {step === 'value' && (
        <Combobox
          key="value"
          autoFocus
          placeholder="Select value"
          loading={valuesQuery.isFetching}
          options={valueOptions}
          value={filter?.value ?? null}
          width={16}
          onChange={commitValue}
        />
      )}
    </div>
  );
}

function toOptions(
  values: MetricFindValue[] | undefined,
): Array<ComboboxOption<string>> {
  if (!values) {
    return [];
  }

  return values.map((v) => ({
    value: String(v.value ?? v.text),
    label: v.text,
  }));
}

/** getTagKeys/getTagValues can resolve a plain array or the newer { data, error } shape. */
function normalizeTagResponse(
  result: GetTagResponse | MetricFindValue[] | undefined,
): MetricFindValue[] {
  if (!result) {
    return [];
  }

  return Array.isArray(result) ? result : result.data;
}

const getStyles = (theme: GrafanaTheme2) => ({
  row: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  segment: css({
    ...theme.typography.bodySmall,
    fontWeight: theme.typography.fontWeightBold,
    color: theme.colors.text.primary,
  }),
  segmentButton: css({
    ...theme.typography.bodySmall,
    color: theme.colors.text.primary,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    '&:hover': {
      textDecoration: 'underline',
    },
  }),
});
