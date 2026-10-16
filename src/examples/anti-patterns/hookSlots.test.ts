import { describe, expect, it } from 'vitest';
import { compareSlots, hookCalls, verdict } from './hookSlots';

const statuses = (
  scenario: Parameters<typeof hookCalls>[0],
  variant: 'broken' | 'fixed',
  first: boolean,
  now: boolean,
) =>
  compareSlots(hookCalls(scenario, variant, first), hookCalls(scenario, variant, now)).map(
    (row) => row.status,
  );

describe('hook slot simulation', () => {
  it('is stable when the condition does not change', () => {
    expect(statuses('conditional-effect', 'broken', true, true)).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('shifts every later slot when a conditional Hook is skipped', () => {
    const rows = compareSlots(
      hookCalls('conditional-effect', 'broken', true),
      hookCalls('conditional-effect', 'broken', false),
    );
    expect(rows.map((row) => row.status)).toEqual([
      'ok',
      'order-changed',
      'order-changed',
      'missing',
    ]);
    expect(rows[1]?.explanation).toBe(
      'useState (surname) landed in the useEffect slot of “persistForm”.',
    );
    expect(verdict(rows).message).toMatch(/Rendered fewer hooks than expected/);
  });

  it('reports extra calls when the condition becomes true later', () => {
    const rows = compareSlots(
      hookCalls('conditional-effect', 'broken', false),
      hookCalls('conditional-effect', 'broken', true),
    );
    expect(rows.at(-1)?.status).toBe('extra');
    expect(verdict(rows).message).toMatch(/Rendered more hooks than during the previous render/);
  });

  it('silently swaps state when Hooks in a loop change order', () => {
    const rows = compareSlots(
      hookCalls('loop-state', 'broken', false),
      hookCalls('loop-state', 'broken', true),
    );
    expect(rows.map((row) => row.status)).toEqual(['wrong-state', 'wrong-state']);
    expect(rows[0]?.explanation).toBe(
      '“Poppins draft” silently reads “Mary draft”\'s value: "Mary draft".',
    );
    expect(verdict(rows).tone).toBe('warn');
  });

  it('never breaks in the fixed variants', () => {
    for (const scenario of ['conditional-effect', 'loop-state'] as const) {
      for (const [first, now] of [
        [true, false],
        [false, true],
      ] as const) {
        const rows = compareSlots(
          hookCalls(scenario, 'fixed', first),
          hookCalls(scenario, 'fixed', now),
        );
        expect(rows.every((row) => row.status === 'ok')).toBe(true);
        expect(verdict(rows).tone).toBe('success');
      }
    }
  });
});
