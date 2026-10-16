import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installMatchMedia } from '../../../test/browserMocks';
import { resolveTheme, THEME_STORAGE_KEY } from './theme';
import ThemeSwitchingScenario from './ThemeSwitchingScenario';

const DARK = '(prefers-color-scheme: dark)';
const LIGHT = '(prefers-color-scheme: light)';
const REDUCE = '(prefers-reduced-motion: reduce)';

const preview = () => screen.getByTestId('theme-preview');

describe('ThemeSwitchingScenario', () => {
  it('follows the OS preference live while "System" is selected', () => {
    const media = installMatchMedia({ [DARK]: true, [LIGHT]: false });
    render(<ThemeSwitchingScenario />);
    expect(screen.getByRole('radio', { name: /System/ })).toBeChecked();
    expect(preview()).toHaveAttribute('data-preview-theme', 'dark');

    media.setMatches(DARK, false);
    media.setMatches(LIGHT, true);
    expect(preview()).toHaveAttribute('data-preview-theme', 'light');
    expect(screen.getByText('(currently light)')).toBeInTheDocument();
  });

  it('persists an explicit choice that overrides the OS', async () => {
    const media = installMatchMedia({ [DARK]: true });
    const user = userEvent.setup();
    const { unmount } = render(<ThemeSwitchingScenario />);

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(preview()).toHaveAttribute('data-preview-theme', 'light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('"light"');
    media.setMatches(DARK, true);
    expect(preview()).toHaveAttribute('data-preview-theme', 'light');

    unmount();
    render(<ThemeSwitchingScenario />);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  });

  it('only themes the scoped container, never the playground', async () => {
    installMatchMedia({ [LIGHT]: true });
    const user = userEvent.setup();
    const before = document.documentElement.getAttribute('data-theme');
    render(<ThemeSwitchingScenario />);
    await user.click(screen.getByRole('button', { name: 'Switch to dark' }));
    expect(preview()).toHaveAttribute('data-preview-theme', 'dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement.getAttribute('data-theme')).toBe(before);
  });

  it('turns the cross-fade off for reduced motion', () => {
    const media = installMatchMedia({ [REDUCE]: true });
    render(<ThemeSwitchingScenario />);
    expect(preview()).toHaveAttribute('data-motion', 'reduce');
    media.setMatches(REDUCE, false);
    expect(preview()).toHaveAttribute('data-motion', 'full');
  });

  it('falls back to light without matchMedia and ignores invalid stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, '"sepia"');
    render(<ThemeSwitchingScenario />);
    expect(screen.getByRole('radio', { name: /System/ })).toBeChecked();
    expect(screen.getByText('System preference unknown')).toBeInTheDocument();
    expect(preview()).toHaveAttribute('data-preview-theme', 'light');
  });
});

describe('resolveTheme', () => {
  it('maps choices and preferences to an applied theme', () => {
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'no-preference')).toBe('light');
  });
});
