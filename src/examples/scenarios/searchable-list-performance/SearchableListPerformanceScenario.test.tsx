import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { filterItems, generateItems, splitMatches, visibleRange } from './catalogData';
import { summarize } from './metrics';
import { SearchBench } from './SearchBench';
import SearchableListPerformanceScenario from './SearchableListPerformanceScenario';

const search = () => screen.getByRole('textbox', { name: /^Search/ });
const results = () => screen.getByRole('region', { name: 'Results' });
const rowsInDom = () => within(results()).queryAllByRole('listitem');
const metricsRow = (strategy: string) =>
  screen.getByRole('row', { name: new RegExp(`^${strategy}`) });
const MS = /\d+\.\d ms/;

describe('benchmark helpers', () => {
  it('generates deterministic data and filters it', () => {
    const items = generateItems(500);
    expect(generateItems(500)).toEqual(items);
    expect(new Set(items.map((item) => item.id)).size).toBe(500);
    const kettles = filterItems(items, 'KETTLE');
    expect(kettles.length).toBeGreaterThan(0);
    expect(kettles.every((item) => item.name.toLowerCase().includes('kettle'))).toBe(true);
    expect(filterItems(items, '  ')).toBe(items);
  });

  it('splits matches for highlighting', () => {
    expect(splitMatches('Smart Lamp', 'am')).toEqual([
      { text: 'Smart L', match: false },
      { text: 'am', match: true },
      { text: 'p', match: false },
    ]);
  });

  it('computes a clamped window with overscan', () => {
    expect(visibleRange(0, 360, 36, 1000, 6)).toEqual({ start: 0, end: 16 });
    expect(visibleRange(3600, 360, 36, 1000, 6)).toEqual({ start: 94, end: 116 });
    // Scrolled past the end after the list shrank: clamp to the last page.
    expect(visibleRange(99_999, 360, 36, 20, 6)).toEqual({ start: 4, end: 20 });
    expect(visibleRange(0, 360, 36, 0, 6)).toEqual({ start: 0, end: 0 });
  });

  it('summarises samples', () => {
    expect(summarize([])).toBeNull();
    expect(summarize([3, 1, 2])).toEqual({ last: 2, median: 2, max: 3 });
    expect(summarize([4, 1, 2, 3])?.median).toBe(2.5);
  });
});

describe('SearchBench', () => {
  it('filters naively and records measured timings', async () => {
    const user = userEvent.setup();
    render(<SearchBench itemCount={300} initialStrategy="naive" />);
    expect(screen.getByText('300 of 300 items match')).toBeInTheDocument();
    expect(rowsInDom()).toHaveLength(300);
    await user.type(search(), 'kettle');
    const expected = filterItems(generateItems(300), 'kettle').length;
    expect(screen.getByText(`${expected} of 300 items match`)).toBeInTheDocument();
    expect(rowsInDom()).toHaveLength(expected);
    const cells = within(metricsRow('naive')).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent(MS);
    expect(cells[1]).toHaveTextContent(MS);
    expect(cells[2]).toHaveTextContent(MS);
    expect(cells[3]).toHaveTextContent(String(expected));
    // Strategies that were not used have no numbers.
    expect(within(metricsRow('deferred')).getAllByRole('cell')[0]).toHaveTextContent('—');
  });

  it('updates the list through useDeferredValue and useTransition', async () => {
    const user = userEvent.setup();
    render(<SearchBench itemCount={300} initialStrategy="naive" />);
    await user.click(screen.getByRole('radio', { name: /useDeferredValue \+ memoised rows/ }));
    await user.type(search(), 'lamp');
    const expected = filterItems(generateItems(300), 'lamp').length;
    expect(await screen.findByText(`${expected} of 300 items match`)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(metricsRow('deferred')).getAllByRole('cell')[0]).toHaveTextContent(MS),
    );

    await user.click(screen.getByRole('radio', { name: /useTransition/ }));
    await user.clear(search());
    await user.type(search(), 'drone');
    const drones = filterItems(generateItems(300), 'drone').length;
    expect(await screen.findByText(`${drones} of 300 items match`)).toBeInTheDocument();
    expect(results()).toHaveAttribute('aria-busy', 'false');
  });

  it('pins rows with a stable callback', async () => {
    const user = userEvent.setup();
    render(<SearchBench itemCount={50} initialStrategy="deferred" />);
    const first = generateItems(50)[0]!;
    const pin = screen.getByRole('button', { name: `Pin ${first.name}` });
    await user.click(pin);
    expect(pin).toHaveAttribute('aria-pressed', 'true');
    await user.click(pin);
    expect(pin).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders only the visible window and follows the scroll position', async () => {
    render(<SearchBench itemCount={1000} initialStrategy="windowed" />);
    expect(screen.getByText('1,000 of 1,000 items match')).toBeInTheDocument();
    expect(rowsInDom()).toHaveLength(16); // 10 visible + 6 overscan below
    expect(rowsInDom()[0]).toHaveAttribute('aria-posinset', '1');
    expect(rowsInDom()[0]).toHaveAttribute('aria-setsize', '1000');

    results().scrollTop = 3600;
    fireEvent.scroll(results());
    await waitFor(() => expect(rowsInDom()[0]).toHaveAttribute('aria-posinset', '95'));
    expect(rowsInDom()).toHaveLength(22);
  });

  it('resets measurements', async () => {
    const user = userEvent.setup();
    render(<SearchBench itemCount={100} initialStrategy="naive" />);
    await user.type(search(), 'a');
    expect(within(metricsRow('naive')).getAllByRole('cell')[0]).toHaveTextContent(MS);
    await user.click(screen.getByRole('button', { name: 'Reset measurements' }));
    expect(within(metricsRow('naive')).getAllByRole('cell')[0]).toHaveTextContent('—');
  });
});

describe('SearchableListPerformanceScenario', () => {
  it('searches 10,000 items and starts windowed', () => {
    render(<SearchableListPerformanceScenario />);
    expect(search()).toHaveAccessibleName('Search 10,000 items');
    expect(screen.getByRole('radio', { name: /windowing/ })).toBeChecked();
    expect(rowsInDom().length).toBeLessThan(30);
  });
});
