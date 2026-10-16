import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Test-only: runs axe-core on a rendered component and fails with a readable
 * list of violations. Page-level rules (`region`) and rules jsdom cannot
 * evaluate (`color-contrast`, which needs layout) are disabled.
 *
 * The shared UI kit's `<EventLog>` (`.event-log`) is excluded by default: it
 * is not part of the hooks under test, and its `<ol role="log">` currently
 * trips `aria-allowed-role`/`listitem` (reported separately).
 */
export async function expectNoAxeViolations(
  container: Element,
  exclude: string[] = ['.event-log'],
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
