import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PersistentPreferencesScenario from './PersistentPreferencesScenario';
import {
  DEFAULT_PREFERENCES,
  isPreferences,
  migratePreferences,
  PREFERENCES_KEY,
  V1_SAMPLE,
} from './preferences';

const stored = () => JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? 'null') as unknown;

describe('PersistentPreferencesScenario', () => {
  it('saves every change in a versioned envelope', async () => {
    const user = userEvent.setup();
    render(<PersistentPreferencesScenario />);
    expect(screen.getByText('(nothing stored — defaults in use)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Font size'), { target: { value: '20' } });
    await user.click(screen.getByLabelText('Spacious'));
    await user.selectOptions(screen.getByLabelText('Language'), 'es');
    await user.click(screen.getByLabelText('Push notifications'));

    expect(stored()).toEqual({
      __v: 2,
      value: {
        fontSizePx: 20,
        density: 'spacious',
        language: 'es',
        notifications: { email: true, push: true, digest: 'weekly' },
      },
    });
    expect(screen.getByText('¡Bienvenido de nuevo!')).toBeInTheDocument();
    expect(screen.getByText(/"fontSizePx": 20/)).toBeInTheDocument();
  });

  it('restores saved preferences after a remount (a new session)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PersistentPreferencesScenario />);
    await user.click(screen.getByLabelText('Email notifications'));
    expect(screen.getByLabelText('Email digest')).toBeDisabled();
    unmount();

    render(<PersistentPreferencesScenario />);
    expect(screen.getByLabelText('Email notifications')).not.toBeChecked();
    expect(screen.getByLabelText('Email digest')).toBeDisabled();
  });

  it('migrates seeded v1 data to v2 and writes it back', async () => {
    const user = userEvent.setup();
    render(<PersistentPreferencesScenario />);
    await user.click(screen.getByRole('button', { name: 'Seed old v1 data' }));

    expect(screen.getByLabelText('Font size')).toHaveValue('20');
    expect(screen.getByLabelText('Compact')).toBeChecked();
    expect(screen.getByLabelText('Language')).toHaveValue('de');
    expect(screen.getByLabelText('Email notifications')).not.toBeChecked();
    expect(screen.getByText('Willkommen zurück!')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('migrated to version 2');
    await waitFor(() => expect(stored()).toMatchObject({ __v: 2, value: { fontSizePx: 20 } }));
    expect(screen.getByText(/"__v": 2/)).toBeInTheDocument();
  });

  it('refuses data from a newer version and corrupt data, falling back to defaults', async () => {
    const user = userEvent.setup();
    render(<PersistentPreferencesScenario />);
    await user.click(screen.getByRole('button', { name: 'Seed future v3 data' }));
    expect(await screen.findByText('Storage problem: version')).toBeInTheDocument();
    expect(screen.getByLabelText('Font size')).toHaveValue('16');
    expect(stored()).toMatchObject({ __v: 3 });

    await user.click(screen.getByRole('button', { name: 'Write corrupt data' }));
    expect(await screen.findByText('Storage problem: migrate')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toHaveValue('en');
  });

  it('syncs with writes from another tab', () => {
    render(<PersistentPreferencesScenario />);
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ __v: 2, value: { ...DEFAULT_PREFERENCES, fontSizePx: 13 } }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: PREFERENCES_KEY }));
    });
    expect(screen.getByLabelText('Font size')).toHaveValue('13');
  });

  it('resets to the defaults', async () => {
    const user = userEvent.setup();
    render(<PersistentPreferencesScenario />);
    await user.click(screen.getByLabelText('Compact'));
    expect(stored()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(screen.getByLabelText('Comfortable')).toBeChecked();
    expect(window.localStorage.getItem(PREFERENCES_KEY)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Preferences reset to the defaults.');
  });
});

describe('preferences schema', () => {
  it('migrates v0/v1 shapes and validates the result', () => {
    const migrated = migratePreferences(V1_SAMPLE, 1);
    expect(isPreferences(migrated)).toBe(true);
    expect(migrated).toMatchObject({ fontSizePx: 20, density: 'compact', language: 'de' });
    expect(migratePreferences({ ...V1_SAMPLE, lang: 'xx' }, 0)).toMatchObject({ language: 'en' });
    expect(() => migratePreferences('{not json', 0)).toThrow(TypeError);
  });

  it('rejects out-of-range values', () => {
    expect(isPreferences(DEFAULT_PREFERENCES)).toBe(true);
    expect(isPreferences({ ...DEFAULT_PREFERENCES, fontSizePx: 99 })).toBe(false);
    expect(isPreferences({ ...DEFAULT_PREFERENCES, notifications: null })).toBe(false);
  });
});
