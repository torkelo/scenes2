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
});
