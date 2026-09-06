import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Collects everything that would indicate a broken boot — uncaught exceptions
 * and `console.error` calls. React surfaces provider and hook failures through
 * both, so a clean list is a real signal that the @grafana/ui theme, the
 * runtime config, and the @grafana/scenes2 alias all resolved.
 */
function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  return errors;
}

test.describe('home page', () => {
  test('renders the heading', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Scenarios' }),
    ).toBeVisible();
    await expect(page).toHaveTitle('Scenarios');
    expect(errors).toEqual([]);
  });

  test('redirects an unknown route to the home page', async ({ page }) => {
    await page.goto('/no-such-page');

    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Scenarios' }),
    ).toBeVisible();
  });
});
