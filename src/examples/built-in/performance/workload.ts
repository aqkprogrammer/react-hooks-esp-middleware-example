/**
 * Deterministic data and CPU work shared by the performance demos.
 *
 * Nothing here touches React: these are plain functions so the demos can show
 * *where* work happens (render, event handler, memoised calculation) without
 * the helpers hiding any React behaviour.
 */

export interface Row {
  id: number;
  name: string;
  team: string;
  score: number;
}

const firstNames = [
  'Ada',
  'Alan',
  'Barbara',
  'Brian',
  'Claude',
  'Dennis',
  'Edsger',
  'Frances',
  'Grace',
  'Hedy',
  'Ivan',
  'John',
  'Katherine',
  'Ken',
  'Linus',
  'Margaret',
  'Niklaus',
  'Radia',
  'Sophie',
  'Tim',
];
const teams = ['Compiler', 'Runtime', 'DevTools', 'Docs', 'Infra'];

/** Builds `count` rows with stable ids and pseudo-random but deterministic values. */
export function makeRows(count: number): Row[] {
  const rows: Row[] = [];
  let seed = 7;
  for (let index = 0; index < count; index += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const first = firstNames[index % firstNames.length] ?? 'Ada';
    rows.push({
      id: index + 1,
      name: `${first} #${index + 1}`,
      team: teams[seed % teams.length] ?? 'Docs',
      score: seed % 1000,
    });
  }
  return rows;
}

/**
 * Deliberately expensive, *pure* calculation: filters rows by a query and,
 * for every match, runs `cost` rounds of arithmetic. Same input → same output,
 * so it is safe to memoise and safe to call during render.
 */
export function rankRows(rows: readonly Row[], query: string, cost: number): Row[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? rows.filter(
        (row) => row.name.toLowerCase().includes(needle) || row.team.toLowerCase() === needle,
      )
    : [...rows];
  const weighted = matches.map((row) => {
    let weight = row.score;
    for (let round = 0; round < cost; round += 1) {
      weight = (weight * 31 + round) % 9973;
    }
    return { row, weight };
  });
  weighted.sort((a, b) => b.weight - a.weight || a.row.id - b.row.id);
  return weighted.map((entry) => entry.row);
}

/**
 * Blocks the main thread for `ms` milliseconds. Used *only* to make an
 * otherwise cheap component artificially slow so the effect of
 * `useTransition` / `useDeferredValue` / `memo` is visible. Real apps never
 * do this — the slowness normally comes from rendering lots of UI.
 */
export function simulateWork(ms: number): void {
  if (ms <= 0) return;
  const start = performance.now();
  while (performance.now() - start < ms) {
    // Busy-wait on purpose.
  }
}

/** Filters rows by name (case-insensitive). Cheap — the cost is in rendering the result. */
export function filterRows(rows: readonly Row[], query: string): Row[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : [...rows];
}
