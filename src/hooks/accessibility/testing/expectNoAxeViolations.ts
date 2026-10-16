import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Test-only: runs axe-core on a rendered component and fails with a readable
 * list of violations. Page-level rules (`region`) and rules jsdom cannot
 * evaluate (`color-contrast`, which needs layout) are disabled.
 *
 * Pass CSS selectors in `exclude` to skip parts of the tree.
 */
export async function expectNoAxeViolations(
  container: Element,
  exclude: string[] = [],
): Promise<void> {
  const context: axe.ElementContext = {
    include: [container],
    exclude: exclude.flatMap((selector) => [...container.querySelectorAll(selector)]),
  };
  const results = await axe.run(context, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}
