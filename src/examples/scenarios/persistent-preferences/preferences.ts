/**
 * Preferences schema, its v1 → v2 migration and a runtime validator.
 * Pure functions, defined at module level so `usePersistentState` gets
 * stable `migrate` / `validate` identities.
 */

export const PREFERENCES_KEY = 'scenario:preferences';
export const PREFERENCES_VERSION = 2;

export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];

export const LANGUAGES = [
  { code: 'en', label: 'English', greeting: 'Welcome back!' },
  { code: 'es', label: 'Español', greeting: '¡Bienvenido de nuevo!' },
  { code: 'de', label: 'Deutsch', greeting: 'Willkommen zurück!' },
  { code: 'ja', label: '日本語', greeting: 'おかえりなさい！' },
] as const;
export type Language = (typeof LANGUAGES)[number]['code'];

export const DIGESTS = ['off', 'daily', 'weekly'] as const;
export type Digest = (typeof DIGESTS)[number];

export const FONT_SIZE = { min: 12, max: 24 } as const;

/** Version 2 — the current shape. */
export interface Preferences {
  fontSizePx: number;
  density: Density;
  language: Language;
  notifications: { email: boolean; push: boolean; digest: Digest };
}

/** Version 1 — what an older release stored. */
export interface PreferencesV1 {
  fontSize: 'small' | 'medium' | 'large';
  compact: boolean;
  lang: string;
  emailNotifications: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  fontSizePx: 16,
  density: 'comfortable',
  language: 'en',
  notifications: { email: true, push: false, digest: 'weekly' },
};

/** Sample data written by the "seed old v1 data" button. */
export const V1_SAMPLE: PreferencesV1 = {
  fontSize: 'large',
  compact: true,
  lang: 'de',
  emailNotifications: false,
};

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

const languageCodes: readonly Language[] = LANGUAGES.map((language) => language.code);

export function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== 'object' || value === null) return false;
  const prefs = value as Record<string, unknown>;
  const notifications = prefs.notifications as Record<string, unknown> | null | undefined;
  return (
    typeof prefs.fontSizePx === 'number' &&
    Number.isInteger(prefs.fontSizePx) &&
    prefs.fontSizePx >= FONT_SIZE.min &&
    prefs.fontSizePx <= FONT_SIZE.max &&
    includes(DENSITIES, prefs.density) &&
    includes(languageCodes, prefs.language) &&
    typeof notifications === 'object' &&
    notifications !== null &&
    typeof notifications.email === 'boolean' &&
    typeof notifications.push === 'boolean' &&
    includes(DIGESTS, notifications.digest)
  );
}

export function isPreferencesV1(value: unknown): value is PreferencesV1 {
  if (typeof value !== 'object' || value === null) return false;
  const prefs = value as Record<string, unknown>;
  return (
    includes(['small', 'medium', 'large'] as const, prefs.fontSize) &&
    typeof prefs.compact === 'boolean' &&
    typeof prefs.lang === 'string' &&
    typeof prefs.emailNotifications === 'boolean'
  );
}

const V1_FONT_SIZES: Record<PreferencesV1['fontSize'], number> = {
  small: 14,
  medium: 16,
  large: 20,
};

/**
 * Upgrades stored data to version 2. Version 0 (written without the
 * versioned envelope) used the v1 shape too. Throwing reports
 * `{ kind: 'migrate' }` and the hook falls back to the defaults.
 */
export function migratePreferences(oldValue: unknown, oldVersion: number): unknown {
  if (oldVersion >= 2) return oldValue;
  if (!isPreferencesV1(oldValue)) {
    throw new TypeError(`Unrecognised version ${oldVersion} preferences`);
  }
  return {
    fontSizePx: V1_FONT_SIZES[oldValue.fontSize],
    density: oldValue.compact ? 'compact' : 'comfortable',
    language: includes(languageCodes, oldValue.lang) ? oldValue.lang : 'en',
    notifications: {
      email: oldValue.emailNotifications,
      push: false,
      digest: oldValue.emailNotifications ? 'weekly' : 'off',
    },
  } satisfies Preferences;
}
