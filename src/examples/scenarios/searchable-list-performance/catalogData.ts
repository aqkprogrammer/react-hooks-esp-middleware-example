/** Deterministic fake catalogue so every visitor (and test) sees the same 10k items. */
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sku: string;
}

const ADJECTIVES = [
  'Compact',
  'Wireless',
  'Smart',
  'Rugged',
  'Classic',
  'Ultra',
  'Eco',
  'Pro',
  'Mini',
  'Silent',
];
const NOUNS = [
  'Widget',
  'Lamp',
  'Kettle',
  'Speaker',
  'Backpack',
  'Keyboard',
  'Monitor',
  'Chair',
  'Drone',
  'Camera',
  'Router',
  'Blender',
];
const CATEGORIES = ['Home', 'Office', 'Outdoor', 'Audio', 'Kitchen', 'Gaming'];

/** mulberry32: tiny seeded PRNG. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(list: readonly T[], next: () => number): T =>
  list[Math.floor(next() * list.length)] as T;

export function generateItems(count: number, seed = 42): CatalogItem[] {
  const next = random(seed);
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    name: `${pick(ADJECTIVES, next)} ${pick(NOUNS, next)} ${index + 1}`,
    category: pick(CATEGORIES, next),
    sku: `SKU-${(100000 + Math.floor(next() * 900000)).toString(36).toUpperCase()}`,
  }));
}

/** Case-insensitive match on name, category or SKU. An empty query matches everything. */
export function filterItems(items: readonly CatalogItem[], query: string): readonly CatalogItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      item.category.toLowerCase().includes(needle) ||
      item.sku.toLowerCase().includes(needle),
  );
}

/** Splits `text` around case-insensitive occurrences of `query` for highlighting. */
export function splitMatches(text: string, query: string): Array<{ text: string; match: boolean }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];
  const parts: Array<{ text: string; match: boolean }> = [];
  const lower = text.toLowerCase();
  let index = 0;
  while (index < text.length) {
    const found = lower.indexOf(needle, index);
    if (found === -1) {
      parts.push({ text: text.slice(index), match: false });
      break;
    }
    if (found > index) parts.push({ text: text.slice(index, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    index = found + needle.length;
  }
  return parts;
}

/** Visible slice for a fixed-row-height window. `end` is exclusive. */
export function visibleRange(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  total: number,
  overscan: number,
): { start: number; end: number } {
  const maxScroll = Math.max(0, total * rowHeight - viewportHeight);
  const top = Math.min(Math.max(0, scrollTop), maxScroll);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(total, Math.ceil((top + viewportHeight) / rowHeight) + overscan);
  return { start, end: Math.max(start, end) };
}
