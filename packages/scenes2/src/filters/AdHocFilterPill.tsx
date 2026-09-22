import { css } from '@emotion/css';
import { useState } from 'react';
import type { GrafanaTheme2 } from '@grafana/data';
import { IconButton, useStyles2 } from '@grafana/ui';

import { useAdhocFilters } from '../hooks/useAdhocFilters';
import { AdHocFilterEditor } from './AdHocFilterEditor';
import type { AdHocFilterWithLabels } from './AdhocFiltersContext';

export interface AdHocFilterPillProps {
  filter: AdHocFilterWithLabels;
}

/** A committed filter, shown as a removable "key op value" chip that opens the editor on click. */
export function AdHocFilterPill({ filter }: AdHocFilterPillProps) {
  const styles = useStyles2(getStyles);
  const { onRemoveFilter } = useAdhocFilters();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <AdHocFilterEditor filter={filter} onDone={() => setEditing(false)} />
    );
  }

  const keyLabel = filter.keyLabel ?? filter.key;
  const valueLabel = filter.valueLabels?.[0] ?? filter.value;

  return (
    <div
      className={styles.pill}
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          setEditing(true);
        }
      }}
    >
      <span>{`${keyLabel} ${filter.operator} ${valueLabel}`}</span>
      <IconButton
        name="times"
        size="sm"
        aria-label={`Remove filter ${keyLabel}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemoveFilter(filter);
        }}
      />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  pill: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    background: theme.colors.action.selected,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    padding: theme.spacing(0.25, 0.5, 0.25, 1),
    color: theme.colors.text.primary,
    ...theme.typography.bodySmall,
    fontWeight: theme.typography.fontWeightBold,
    cursor: 'pointer',
    '&:hover': {
      background: theme.colors.action.hover,
    },
  }),
});
