import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SHOT_DIR;

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png` });
}

async function runAndWait(page: Page, outcome: RegExp) {
  await page.getByRole('radio', { name: 'x4' }).click();
  await page.getByRole('button', { name: /Run attack|Run again/ }).click();
  await expect(page.getByRole('status').filter({ hasText: outcome })).toBeVisible({ timeout: 15_000 });
}

test('the attack reaches the database, then segmentation contains it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cyber Attack Surface Lab' })).toBeVisible();
  await snap(page, '0-start');

  await runAndWait(page, /Target reached/i);
  await expect(page.getByRole('tabpanel')).toContainText('reads Customer data');
  await snap(page, '1-reached');

  await page.getByRole('switch', { name: /Network segmentation/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /run the attack again/i })).toBeVisible();
  await runAndWait(page, /Attack contained/i);
  await snap(page, '2-contained');

  await page.getByRole('tab', { name: 'Why?' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Stopped by');
  await snap(page, '3-why');

  await page.getByRole('tab', { name: 'Before / after' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Target reached');
  await expect(page.getByRole('tabpanel')).toContainText('Attack contained');
  await snap(page, '4-compare');

  expect(errors).toEqual([]);
});

test('a shared link opens the same lab and scenario', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('switch', { name: /MFA for administrators/ }).click();
  await page.getByRole('radio', { name: /Assumed breach/ }).check();
  await page.getByRole('button', { name: 'Share' }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('#lab=');

  const other = await context.newPage();
  await other.goto(link);
  await expect(other.getByRole('switch', { name: /MFA for administrators/ })).toHaveAttribute('aria-checked', 'true');
  await expect(other.getByRole('radio', { name: /Assumed breach/ })).toBeChecked();
  expect(other.url()).not.toContain('#lab=');
});

test('the page works in French and in the text view', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Language').selectOption('fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.getByRole('button', { name: 'Lancer l’attaque' }).click();
  await page.getByRole('tab', { name: 'Vue texte' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Déroulé de l’attaque');
  await expect(page.getByRole('tabpanel')).toContainText('Base clients', { timeout: 10_000 });
  await snap(page, '5-french-text');
});
