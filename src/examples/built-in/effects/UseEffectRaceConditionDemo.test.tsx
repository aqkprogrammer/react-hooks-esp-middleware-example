import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { languages } from '../../../mocks/data';
import { server } from '../../../test/server';
import UseEffectRaceConditionDemo from './UseEffectRaceConditionDemo';

/** Deterministic inverted latency: older (shorter) queries answer last. */
const latencyByQuery: Record<string, number> = { j: 150, ja: 90, jav: 10 };

function useInvertedLatency() {
  server.use(
    http.get('/api/search', async ({ request }) => {
      const query = new URL(request.url).searchParams.get('q') ?? '';
      await delay(latencyByQuery[query] ?? 10);
      if (query === 'error') {
        return HttpResponse.json({ message: 'Search service unavailable' }, { status: 503 });
      }
      const results = languages.filter((name) => name.toLowerCase().includes(query));
      return HttpResponse.json({ query, results });
    }),
  );
}

const section = (name: string) => within(screen.getByRole('region', { name }));

describe('UseEffectRaceConditionDemo', () => {
  it('the buggy panel ends on a stale response; the fixed one shows the latest query', async () => {
    useInvertedLatency();
    const user = userEvent.setup();
    render(<UseEffectRaceConditionDemo />);
    await user.type(screen.getByLabelText('Search languages'), 'jav');

    // The slowest ("j") response is the last to arrive and overwrites the buggy panel.
    expect(
      await section('Buggy results').findByText('"j"', {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(section('Buggy results').getByText('does not match the input')).toBeInTheDocument();
    expect(section('Buggy results').getByText('Julia')).toBeInTheDocument(); // matches "j", not "jav"

    expect(section('Fixed results').getByText('"jav"')).toBeInTheDocument();
    const fixed = section('Fixed results')
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(fixed.length).toBeGreaterThan(0);
    expect(fixed.every((name) => name?.toLowerCase().includes('jav'))).toBe(true);
    expect(section('Fixed results').queryByText('loading…')).not.toBeInTheDocument();

    const log = within(screen.getByRole('log', { name: 'Requests' }));
    expect(log.getByText(/fixed: aborted "j"$/)).toBeInTheDocument();
    expect(log.getByText(/fixed: aborted "ja"$/)).toBeInTheDocument();
    expect(log.queryByText(/fixed: applied "j"$/)).not.toBeInTheDocument();
    expect(log.getByText(/bug: applied "j"$/)).toBeInTheDocument();
  });

  it('shows server errors for the current query', async () => {
    useInvertedLatency();
    const user = userEvent.setup();
    render(<UseEffectRaceConditionDemo />);
    await user.click(screen.getByLabelText('Search languages'));
    await user.paste('error');
    expect(await section('Fixed results').findByRole('alert')).toHaveTextContent(
      'Search service unavailable',
    );
  });

  it('clears the results when the input is emptied', async () => {
    useInvertedLatency();
    const user = userEvent.setup();
    render(<UseEffectRaceConditionDemo />);
    const input = screen.getByLabelText('Search languages');
    await user.click(input);
    await user.paste('jav');
    expect(await section('Fixed results').findByText('Java')).toBeInTheDocument();
    await user.clear(input);
    expect(section('Fixed results').getByText('No results')).toBeInTheDocument();
  });
});
