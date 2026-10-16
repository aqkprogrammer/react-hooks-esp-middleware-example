import type { CatalogEntry } from '../catalog';

/** Lower-cased, punctuation-insensitive words. */
const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9#+]+/g, ' ')
    .trim();

/**
 * Scores entries against a query: every query word must match somewhere;
 * title matches weigh most, then tags/category, then summary.
 */
export function searchCatalog(query: string, entries: readonly CatalogEntry[]): CatalogEntry[] {
  const words = normalise(query).split(' ').filter(Boolean);
  if (words.length === 0) return [...entries];
  const scored: Array<{ entry: CatalogEntry; score: number }> = [];
  for (const entry of entries) {
    const title = normalise(entry.title);
    const tags = normalise(`${entry.tags.join(' ')} ${entry.category} ${entry.id}`);
    const summary = normalise(`${entry.summary} ${entry.concept}`);
    let score = 0;
    let matchedAll = true;
    for (const word of words) {
      let wordScore = 0;
      if (title === word) wordScore += 20;
      if (title.includes(word)) wordScore += 10;
      if (tags.includes(word)) wordScore += 4;
      if (summary.includes(word)) wordScore += 1;
      if (wordScore === 0) {
        matchedAll = false;
        break;
      }
      score += wordScore;
    }
    if (matchedAll) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map(({ entry }) => entry);
}
