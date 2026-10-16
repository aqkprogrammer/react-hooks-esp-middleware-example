import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { catalog } from '../src/catalog';

/**
 * Opens every catalog page in a real browser, waits for its live demo to
 * load, and fails on demo crashes, console errors or serious/critical axe
 * violations. Run with `npm run test:e2e`.
 */
for (const entry of catalog) {
  test(`${entry.id} renders without errors or serious a11y violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(`/#/entry/${entry.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (entry.demo) {
      const demo = page.getByRole('region', { name: `Live demo: ${entry.title}` });
      await expect(demo).toBeVisible();
      await expect(demo.getByText('Loading demo…')).toHaveCount(0, { timeout: 15_000 });
      await expect(demo.getByText('This demo crashed')).toHaveCount(0);
    }
    await expect(page.getByText('Loading source…')).toHaveCount(0, { timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const serious = results.violations
      .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
      .map(
        (violation) =>
          `${violation.id}: ${violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(' '))
            .join(' | ')}`,
      );
    expect(serious).toEqual([]);
    expect(errors).toEqual([]);
  });
}
