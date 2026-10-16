import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(
    serious.map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(' | ')}`,
    ),
  ).toEqual([]);
}

test('home page renders and has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('fundamentals to advanced');
  await expectNoSeriousA11yViolations(page);
});

test('search navigates to filtered results', async ({ page }) => {
  await page.goto('/');
  // Wait for the app to mount (it starts after the mock API worker).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('/');
  await page.keyboard.type('debounce');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/browse\?q=debounce/);
  await expect(page.getByRole('status').first()).toContainText('result');
  await expectNoSeriousA11yViolations(page);
});

test('the original esp-js demo routes events in a real browser', async ({ page }) => {
  await page.goto('/#/entry/esp-original-workspace');
  const accumulators = page.getByRole('article', { name: /Accumulators Tile/ });
  const price = page.getByRole('article', { name: /Price Tile/ });
  await accumulators.getByLabel('Accumulator', { exact: true }).fill('Range Accrual');
  await accumulators.getByRole('button', { name: 'Insert (Broadcast)' }).click();
  await expect(accumulators.getByText('Accumulator List: 3')).toBeVisible();
  await expect(price.getByText('Insert', { exact: true })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test('the mocked API is served by the MSW service worker', async ({ page }) => {
  await page.goto('/#/entry/esp-original-workspace');
  await page.getByLabel('Username').fill('ada');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('UserToken: demo-token-ada')).toBeVisible();
});

test('entry pages show source code and the theme can be switched', async ({ page }) => {
  await page.goto('/#/entry/use-local-storage');
  await expect(page.getByRole('region', { name: 'Code: useLocalStorage.ts' })).toContainText(
    'export function useLocalStorage',
  );
  await page.getByLabel('Color theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoSeriousA11yViolations(page);
});
