import { css } from '@emotion/css';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

export function HomePage() {
  const styles = useStyles2(getStyles);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Scenarios</h1>
    </main>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
  }),
  heading: css({
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
  }),
});
