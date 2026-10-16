import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../test/expectNoAxeViolations';
import { server } from '../../../test/server';
import AutocompleteScenario from './AutocompleteScenario';
import { splitMatch } from './suggestions';

const LANGUAGES = ['Java', 'JavaScript', 'Julia', 'Kotlin', 'TypeScript'];

function mockSearch(requested: string[] = [], latency: (q: string) => number = () => 0) {
  server.use(
    http.get('/api/search', async ({ request }) => {
      const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase();
      requested.push(q);
      await delay(latency(q));
      if (q === 'error') return HttpResponse.json({ message: 'down' }, { status: 503 });
      return HttpResponse.json({
        query: q,
        results: LANGUAGES.filter((name) => name.toLowerCase().includes(q)),
      });
    }),
  );
  return requested;
}

const combobox = () => screen.getByRole('combobox', { name: 'Programming language' });
const politeRegion = () => document.querySelector('[data-live-announcer="polite"]');

async function typeAndOpen(text: string) {
  const user = userEvent.setup();
  render(<AutocompleteScenario />);
  await user.type(combobox(), text);
  const listbox = await screen.findByRole('listbox', {}, { timeout: 2000 });
  return { user, listbox };
}

describe('AutocompleteScenario', () => {
  it('wires the APG combobox attributes and opens the listbox with highlighted matches', async () => {
    mockSearch();
    const { listbox } = await typeAndOpen('ja');
    const input = combobox();
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(listbox).toHaveAccessibleName('Programming language suggestions');
    const options = within(listbox).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Java', 'JavaScript']);
    expect(options[1]?.querySelector('mark')).toHaveTextContent('Ja');
    expect(input).toHaveFocus();
  });

  it('moves the active option with the arrow keys, Home and End (wrapping)', async () => {
    mockSearch();
    const { user, listbox } = await typeAndOpen('a');
    const input = combobox();
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3); // Java, JavaScript, Julia

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2]?.id);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id);
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2]?.id);
    await user.keyboard('{Home}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id);
    await user.keyboard('{End}');
    expect(input).toHaveAttribute('aria-activedescendant', options[2]?.id);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    expect(input).toHaveFocus();
  });

  it('selects with Enter, closes the popup and keeps focus in the input', async () => {
    mockSearch();
    const { user } = await typeAndOpen('jav');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    const input = combobox();
    expect(input).toHaveValue('JavaScript');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveFocus();
    expect(screen.getByRole('list', { name: 'Chosen languages' })).toHaveTextContent('JavaScript');
  });

  it('selects with a click without blurring the input', async () => {
    mockSearch();
    const { user, listbox } = await typeAndOpen('jul');
    await user.click(within(listbox).getByRole('option', { name: 'Julia' }));
    expect(combobox()).toHaveValue('Julia');
    expect(combobox()).toHaveFocus();
    expect(screen.getByRole('list', { name: 'Chosen languages' })).toHaveTextContent('Julia');
  });

  it('closes with Escape, reopens with ArrowDown, and clears on a second Escape', async () => {
    mockSearch();
    const { user } = await typeAndOpen('script');
    const input = combobox();
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveValue('script');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    const first = screen.getAllByRole('option')[0];
    expect(input).toHaveAttribute('aria-activedescendant', first?.id);

    await user.keyboard('{Escape}{Escape}');
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the popup when focus leaves the input', async () => {
    mockSearch();
    const { user } = await typeAndOpen('ja');
    await user.tab();
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('debounces typing into one request and announces the result count', async () => {
    const requested = mockSearch();
    await typeAndOpen('java');
    expect(requested).toEqual(['java']);
    await waitFor(() =>
      expect(politeRegion()).toHaveTextContent(
        '2 suggestions available. Use the up and down arrow keys to review them.',
      ),
    );
  });

  it('shows and announces the "no results" state without an empty listbox', async () => {
    mockSearch();
    const user = userEvent.setup();
    render(<AutocompleteScenario />);
    await user.type(combobox(), 'zzz');
    expect(
      await screen.findByText('No languages match “zzz”.', {}, { timeout: 2000 }),
    ).toBeVisible();
    expect(combobox()).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(politeRegion()).toHaveTextContent('No languages match zzz.'));
  });

  it('shows the error state and recovers with Retry', async () => {
    let fail = true;
    server.use(
      http.get('/api/search', () =>
        fail
          ? HttpResponse.json({ message: 'down' }, { status: 503 })
          : HttpResponse.json({ query: 'error', results: ['Erlang'] }),
      ),
    );
    const user = userEvent.setup();
    render(<AutocompleteScenario />);
    await user.type(combobox(), 'error');
    expect(
      await screen.findByText(/Suggestions are unavailable \(HTTP 503\)/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(politeRegion()).toHaveTextContent('Suggestions are unavailable.'));

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText(/unavailable \(HTTP/)).toBeNull());
    await user.click(combobox());
    await user.keyboard('{ArrowDown}');
    expect(await screen.findByRole('option', { name: 'Erlang' })).toBeInTheDocument();
  });

  it('never lets a slow, stale response replace newer suggestions', async () => {
    // Inverted latency: the earlier, shorter query answers last.
    const requested = mockSearch([], (q) => (q === 'j' ? 500 : 10));
    const user = userEvent.setup();
    render(<AutocompleteScenario />);
    const input = combobox();
    await user.type(input, 'j');
    await waitFor(() => expect(requested).toEqual(['j']));
    await user.type(input, 'ul');
    expect(await screen.findByRole('option', { name: 'Julia' }, { timeout: 2000 })).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Julia']);
  });

  it('has no detectable accessibility violations with the popup open', async () => {
    mockSearch();
    const { user } = await typeAndOpen('ja');
    await user.keyboard('{ArrowDown}');
    await expectNoAxeViolations(document.body);
  });
});

describe('splitMatch', () => {
  it('splits around the first case-insensitive match', () => {
    expect(splitMatch('TypeScript', 'script')).toEqual({
      before: 'Type',
      match: 'Script',
      after: '',
    });
    expect(splitMatch('Go', 'x')).toEqual({ before: 'Go', match: '', after: '' });
    expect(splitMatch('Go', '  ')).toEqual({ before: 'Go', match: '', after: '' });
  });
});
