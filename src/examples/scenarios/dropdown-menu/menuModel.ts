export type SortKey = 'name' | 'size' | 'modified';

export type MenuItemDefinition =
  | { kind: 'action'; id: 'new-folder' | 'refresh' | 'share'; label: string; disabled?: string }
  | { kind: 'checkbox'; id: 'showHidden' | 'showSizes'; label: string }
  | { kind: 'radio'; id: SortKey; label: string };

/** Flat list in DOM order — the index is what `useRovingTabIndex` works with. */
export const MENU_ITEMS: readonly MenuItemDefinition[] = [
  { kind: 'action', id: 'new-folder', label: 'New folder' },
  { kind: 'action', id: 'refresh', label: 'Refresh' },
  { kind: 'checkbox', id: 'showHidden', label: 'Show hidden files' },
  { kind: 'checkbox', id: 'showSizes', label: 'Show file sizes' },
  { kind: 'radio', id: 'name', label: 'Name' },
  { kind: 'radio', id: 'size', label: 'Size' },
  { kind: 'radio', id: 'modified', label: 'Date modified' },
  { kind: 'action', id: 'share', label: 'Share…', disabled: 'Sign in to share files' },
];

/**
 * First-letter typeahead (APG menu): the next item after `from` whose label
 * starts with `character`, wrapping around; `-1` when none does.
 */
export function findByFirstLetter(
  labels: readonly string[],
  from: number,
  character: string,
): number {
  const wanted = character.toLocaleLowerCase();
  for (let offset = 1; offset <= labels.length; offset += 1) {
    const index = (from + offset) % labels.length;
    if (labels[index]?.toLocaleLowerCase().startsWith(wanted)) return index;
  }
  return -1;
}

export interface FileEntry {
  name: string;
  sizeKb: number;
  modified: string;
}

export const INITIAL_FILES: readonly FileEntry[] = [
  { name: 'report.pdf', sizeKb: 820, modified: '2026-09-30' },
  { name: 'budget.xlsx', sizeKb: 46, modified: '2026-10-12' },
  { name: '.env.local', sizeKb: 1, modified: '2026-08-01' },
  { name: 'photos', sizeKb: 15_300, modified: '2026-07-21' },
  { name: '.cache', sizeKb: 2_048, modified: '2026-10-15' },
];

export function sortFiles(files: readonly FileEntry[], key: SortKey): FileEntry[] {
  return [...files].sort((a, b) => {
    if (key === 'size') return b.sizeKb - a.sizeKb;
    if (key === 'modified') return b.modified.localeCompare(a.modified);
    return a.name.replace(/^\./, '').localeCompare(b.name.replace(/^\./, ''));
  });
}
