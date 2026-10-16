import { expect, test } from '@playwright/test';

test('navigation is reachable through the menu button on small screens', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Navigation' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page
    .getByRole('navigation', { name: 'Sections' })
    .getByRole('link', { name: 'Custom Hooks' })
    .click();
  await expect(page).toHaveURL(/section=custom/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
