import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SHOT_DIR;

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-editor-${name}.png` });
}

const node = (page: Page, text: string) => page.locator('.react-flow__node-asset', { hasText: text });

test('build a lab from scratch and attack it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByLabel('Open a lab').selectOption('new');
  await expect(page.getByRole('radio', { name: 'Edit' })).toHaveAttribute('aria-checked', 'true');

  // Add a web server from the palette and make its service vulnerable.
  await page.getByRole('button', { name: 'Web server' }).click();
  await expect(node(page, 'Web server')).toBeVisible();
  await page.getByRole('checkbox', { name: 'injection flaw' }).check();

  // Declare the flow Internet -> web server from the Internet element.
  await node(page, 'Internet').first().click();
  await page.getByRole('button', { name: 'Add a flow' }).click();
  await expect(page.locator('.react-flow__edge-flow')).toHaveCount(1);

  // Add the data to protect on the web server and make it the scenario target.
  await page.getByRole('tab', { name: 'Assets' }).click();
  await page.getByRole('button', { name: 'Add an asset' }).click();
  await page.getByRole('tab', { name: 'Scenarios' }).click();
  await page.getByLabel('Target').selectOption({ label: 'Sensitive data' });
  await snap(page, '1-built');

  await page.getByRole('button', { name: 'Run attack' }).click();
  await expect(page.getByRole('radio', { name: 'Simulate' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: 'x4' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Target reached/i })).toBeVisible({ timeout: 15_000 });
  await snap(page, '2-attacked');

  // The lab survives a reload (autosave).
  await page.reload();
  await expect(node(page, 'Web server')).toBeVisible();
  expect(errors).toEqual([]);
});

test('undo, redo and problems', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Edit' }).click();
  const before = await page.locator('.react-flow__node-asset').count();

  await page.getByRole('button', { name: 'Database' }).click();
  await expect(page.locator('.react-flow__node-asset')).toHaveCount(before + 1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.react-flow__node-asset')).toHaveCount(before);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.locator('.react-flow__node-asset')).toHaveCount(before + 1);

  await page.getByRole('tab', { name: 'Controls' }).click();
  await page.getByLabel('New control').selectOption('mfa');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('tab', { name: /Problems/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('applies to nothing yet');
  await snap(page, '3-problems');
});

test('delete an element with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Edit' }).click();
  await node(page, 'Admin Jump Host').click();
  await page.keyboard.press('Delete');
  await expect(node(page, 'Admin Jump Host')).toHaveCount(0);
  await expect(page.locator('.react-flow__edge-flow')).toHaveCount(3);
});

test('open another template', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Open a lab').selectOption({ label: 'Active Directory' });
  await expect(node(page, 'Domain Controller')).toBeVisible();
  await page.getByRole('switch', { name: /Admin tiering/ }).click();
  await page.getByRole('radio', { name: 'x4' }).click();
  await page.getByRole('button', { name: /Run/ }).click();
  await expect(page.getByRole('status').filter({ hasText: /Attack contained/i })).toBeVisible({ timeout: 15_000 });
  await snap(page, '4-active-directory');
});
