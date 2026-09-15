import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('List scenarios', () => {
  test('Should show scenario list', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Home}`);
    await expect(page.getByText('Select demo')).toBeVisible();
  });
});
