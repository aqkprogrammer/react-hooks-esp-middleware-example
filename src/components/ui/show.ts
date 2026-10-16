/** Formats any value for display in a ValueTable. */
export function show(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return 'ƒ()';
  if (value instanceof Error) return `Error: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
