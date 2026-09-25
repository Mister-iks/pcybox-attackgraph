import { expect, test } from '@playwright/test';

// Regenerates the images of the README: UPDATE_SCREENSHOTS=1 pnpm e2e --project=desktop readme
test.skip(!process.env.UPDATE_SCREENSHOTS, 'Only when updating the README images');
test.use({ colorScheme: 'dark', viewport: { width: 1440, height: 860 }, deviceScaleFactor: 1 });

const out = '../../docs/images';

test('readme screenshots', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'x4' }).click();
  await page.getByRole('button', { name: 'Run attack' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Target reached/i })).toBeVisible({ timeout: 15_000 });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${out}/attack-reached.png` });

  await page.getByRole('switch', { name: /Network segmentation/ }).click();
  await page.getByRole('button', { name: 'Run again' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Attack contained/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Why?' }).click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `${out}/attack-contained.png` });
});
