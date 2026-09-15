import { expect, test } from '@playwright/test';

test.describe('time range picker', () => {
  test('updates the URL when the time range changes', async ({ page }) => {
    await page.goto('/single-panel-demo');

    expect(new URL(page.url()).searchParams.get('from')).toBeNull();

    await page.getByTestId('data-testid TimePicker Open Button').click();
    await page
      .getByTestId('data-testid TimePicker time range option now-5m to now')
      .click();

    await expect(page).toHaveURL(/[?&]from=now-5m&to=now(&|$)/);
  });

  test('restores the previous time range with the browser back button', async ({
    page,
  }) => {
    await page.goto('/single-panel-demo');
    const openButton = page.getByTestId('data-testid TimePicker Open Button');

    await openButton.click();
    await page
      .getByTestId('data-testid TimePicker time range option now-5m to now')
      .click();
    await expect(page).toHaveURL(/[?&]from=now-5m&to=now(&|$)/);

    await openButton.click();
    await page
      .getByTestId('data-testid TimePicker time range option now-30m to now')
      .click();
    await expect(page).toHaveURL(/[?&]from=now-30m&to=now(&|$)/);

    await page.goBack();

    await expect(page).toHaveURL(/[?&]from=now-5m&to=now(&|$)/);
    await expect(openButton).toContainText('Last 5 minutes');
  });

  test('initializes the time range from from/to query params on load', async ({
    page,
  }) => {
    await page.goto('/single-panel-demo?from=now-1h&to=now');

    const openButton = page.getByTestId('data-testid TimePicker Open Button');
    await expect(openButton).toContainText('Last 1 hour');

    await page.reload();

    await expect(page).toHaveURL(/[?&]from=now-1h&to=now(&|$)/);
    await expect(openButton).toContainText('Last 1 hour');
  });
});
