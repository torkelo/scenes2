import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { useAdhocFilters } from '../hooks/useAdhocFilters';
import { AdHocFilterEditor } from './AdHocFilterEditor';
import { AdHocFilterPill } from './AdHocFilterPill';

/**
 * Renders the committed filters as removable pills, plus an always-present
 * editor slot for adding the next one. Reads and writes filters through
 * AdhocFiltersContext - wrap this in an AdhocFiltersProvider.
 */
export function AdHocFiltersCombobox() {
  const { filters } = useAdhocFilters();
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.wrapper}>
      {filters.map((filter, index) => (
        <AdHocFilterPill key={`${filter.key}-${index}`} filter={filter} />
      ))}
      {/* Remounts on every commit, so its step/draft state resets for the next filter. */}
      <AdHocFilterEditor key={filters.length} onDone={() => {}} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing(1),
    minHeight: theme.spacing(4),
    padding: theme.spacing(0.5, 1),
    border: `1px solid ${theme.components.input.borderColor}`,
    borderRadius: theme.shape.radius.default,
    background: theme.components.input.background,
  }),
});
