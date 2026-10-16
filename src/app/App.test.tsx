import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { highlight } from './highlight';
import { parseHash } from './router';

afterEach(() => {
  window.location.hash = '';
  delete document.documentElement.dataset.theme;
});

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

describe('playground shell', () => {
  it('renders the home page with section links', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /fundamentals to advanced/i,
    );
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('link', {
        name: 'ESP-JS Integration',
      }),
    ).toBeInTheDocument();
  });

  it('opens an entry page with its live demo, source and tests', async () => {
    render(<App />);
    await go('#/entry/use-local-storage');
    expect(screen.getByRole('heading', { level: 1, name: 'useLocalStorage' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Live demo: useLocalStorage' })).toBeInTheDocument();
    // The demo is lazy-loaded.
    expect(await screen.findByLabelText('Note', {}, { timeout: 5000 })).toBeInTheDocument();
    // The real source file is loaded as raw text.
    expect(
      await screen.findByRole('region', { name: 'Code: useLocalStorage.ts' }, { timeout: 5000 }),
    ).toHaveTextContent('export function useLocalStorage');
  });

  it('filters the catalog by search query', async () => {
    const user = userEvent.setup();
    render(<App />);
    await go('#/browse');
    const search = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(search, 'localStorage');
    const results = await screen.findAllByRole('listitem');
    expect(results.some((item) => within(item).queryByText('useLocalStorage'))).toBe(true);
    expect(window.location.hash).toContain('q=localStorage');
  });

  it('marks topics as learned and shows progress on the learning path', async () => {
    const user = userEvent.setup();
    render(<App />);
    await go('#/entry/use-latest');
    await user.click(screen.getByRole('button', { name: 'Mark as learned' }));
    expect(screen.getByRole('button', { name: '✓ Learned' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await go('#/learn');
    expect(screen.getByRole('checkbox', { name: 'Mark useLatest as learned' })).toBeChecked();
  });

  it('applies an explicit theme to <html>', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Color theme' }), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('shows a not-found page for unknown routes', async () => {
    render(<App />);
    await go('#/entry/does-not-exist');
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('router and highlighter helpers', () => {
  it('parses hash routes with query strings', () => {
    const location = parseHash('#/browse?section=custom&q=debounce');
    expect(location.path).toBe('/browse');
    expect(location.params.get('section')).toBe('custom');
    expect(parseHash('').path).toBe('/');
  });

  it('tokenises keywords, strings and comments', () => {
    const kinds = highlight("const x = 'a'; // note").map((token) => token.kind);
    expect(kinds).toContain('keyword');
    expect(kinds).toContain('string');
    expect(kinds).toContain('comment');
  });
});
