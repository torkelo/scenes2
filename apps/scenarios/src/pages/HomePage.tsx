import { css } from '@emotion/css';
import { Link } from 'react-router-dom';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

interface Scenario {
  path: string;
  label: string;
}

const scenarios: Scenario[] = [
  { path: '/panel-grid-layout-demo', label: 'Panel grid layout demo' },
];

export function HomePage() {
  const styles = useStyles2(getStyles);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Scenarios</h1>
      <ul className={styles.list}>
        {scenarios.map((scenario) => (
          <li key={scenario.path}>
            <Link to={scenario.path}>{scenario.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  }),
  heading: css({
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
  }),
  list: css({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
});
