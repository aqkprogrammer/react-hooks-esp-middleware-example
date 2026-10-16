import { fetchJson } from '../../../hooks';

export interface Stats {
  tick: number;
  activeUsers: number;
  requestsPerMinute: number;
  /** Percent, e.g. `0.3` for 0.3 %. */
  errorRate: number;
  updatedAt: string;
}

const isStats = (value: unknown): value is Stats => {
  if (typeof value !== 'object' || value === null) return false;
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.tick === 'number' &&
    typeof stats.activeUsers === 'number' &&
    typeof stats.requestsPerMinute === 'number' &&
    typeof stats.errorRate === 'number' &&
    typeof stats.updatedAt === 'string'
  );
};

async function parseStats(response: Response): Promise<Stats> {
  const body: unknown = await response.json();
  if (!isStats(body)) throw new TypeError('Unexpected /api/stats response');
  return body;
}

/** One poll. A hung request is cut off before the next one is due. */
export function fetchStats(signal: AbortSignal): Promise<Stats> {
  return fetchJson('/api/stats', { signal, parse: parseStats, timeoutMs: 5000 });
}

export interface Kpi {
  key: 'activeUsers' | 'requestsPerMinute' | 'errorRate';
  label: string;
  format: (value: number) => string;
  /** Whether a rising value is good news (drives the wording, not just colour). */
  higherIsBetter: boolean;
}

const integer = new Intl.NumberFormat('en-US');
const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export const KPIS: readonly Kpi[] = [
  { key: 'activeUsers', label: 'Active users', format: integer.format, higherIsBetter: true },
  {
    key: 'requestsPerMinute',
    label: 'Requests / min',
    format: integer.format,
    higherIsBetter: true,
  },
  {
    key: 'errorRate',
    label: 'Error rate',
    format: (value) => `${percent.format(value)}%`,
    higherIsBetter: false,
  },
];
