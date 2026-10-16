export type CommandGroup = 'Recent' | 'Navigation' | 'Actions';

export interface Command {
  id: string;
  title: string;
  group: Exclude<CommandGroup, 'Recent'>;
  /** Extra words that should find this command. */
  keywords?: readonly string[];
  /** Shown next to the title, e.g. the route a navigation command opens. */
  hint?: string;
  run: () => void;
}

export interface CommandSection {
  group: CommandGroup;
  commands: Command[];
}

export const RECENT_KEY = 'scenario:command-palette:recent';
export const MAX_RECENT = 5;

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Most recent first, without duplicates, capped at {@link MAX_RECENT}. */
export function pushRecent(recent: readonly string[], id: string): string[] {
  return [id, ...recent.filter((item) => item !== id)].slice(0, MAX_RECENT);
}

/**
 * 0 = no match. Every whitespace-separated term must appear in the title or
 * the keywords; titles that start with the query rank first.
 */
export function scoreCommand(command: Command, query: string): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 1;
  const title = command.title.toLowerCase();
  const haystack = [title, ...(command.keywords ?? []).map((word) => word.toLowerCase())].join(' ');
  const terms = normalized.split(/\s+/);
  if (!terms.every((term) => haystack.includes(term))) return 0;
  if (title.startsWith(normalized)) return 3;
  return title.includes(normalized) ? 2 : 1;
}

/**
 * Groups for the listbox. Without a query: recent commands first (and not
 * repeated below). With a query: matching commands per group, best first.
 */
export function buildSections(
  commands: readonly Command[],
  query: string,
  recentIds: readonly string[],
): CommandSection[] {
  const byId = new Map(commands.map((command) => [command.id, command]));
  const sections: CommandSection[] = [];
  const hasQuery = query.trim() !== '';
  const recent = hasQuery
    ? []
    : recentIds.flatMap((id) => {
        const command = byId.get(id);
        return command ? [command] : [];
      });
  if (recent.length) sections.push({ group: 'Recent', commands: recent });
  for (const group of ['Navigation', 'Actions'] as const) {
    const matches = commands
      .filter((command) => command.group === group && !recent.includes(command))
      .map((command, index) => ({ command, index, score: scoreCommand(command, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.command);
    if (matches.length) sections.push({ group, commands: matches });
  }
  return sections;
}
