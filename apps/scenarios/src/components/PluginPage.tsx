import { css } from '@emotion/css';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

export interface PluginPageBreadcrumb {
  text: string;
  url?: string;
}

export interface PluginPageProps {
  breadcrumbs?: PluginPageBreadcrumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Standalone stand-in for @grafana/runtime's PluginPage, modeled after
 * Grafana core's Page/PageHeader (public/app/core/components/Page). A real
 * Grafana instance renders breadcrumbs from the page's nav-tree position in
 * its own chrome, outside PluginPage; this app has no chrome to put them in,
 * so breadcrumbs are a prop here instead.
 */
export function PluginPage({
  breadcrumbs,
  title,
  description,
  actions,
  children,
}: PluginPageProps) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={`${breadcrumb.text}-${index}`}>
                {breadcrumb.url ? (
                  <Link to={breadcrumb.url}>{breadcrumb.text}</Link>
                ) : (
                  breadcrumb.text
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className={styles.separator}>/</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  page: css({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: theme.colors.background.page,
  }),
  header: css({
    padding: theme.spacing(2, 3),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
  }),
  breadcrumbs: css({
    display: 'flex',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  separator: css({
    marginLeft: theme.spacing(1),
  }),
  titleRow: css({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  }),
  title: css({
    margin: 0,
    color: theme.colors.text.primary,
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
  }),
  description: css({
    margin: theme.spacing(0.5, 0, 0, 0),
    color: theme.colors.text.secondary,
  }),
  actions: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flexShrink: 0,
  }),
  content: css({
    flex: 1,
    padding: theme.spacing(3),
  }),
});
