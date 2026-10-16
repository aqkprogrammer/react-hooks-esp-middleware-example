import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installIntersectionObserver } from '../../../test/browserMocks';
import UseAsyncDemo from './UseAsyncDemo';
import UseInfiniteScrollDemo from './UseInfiniteScrollDemo';
import UsePollingDemo from './UsePollingDemo';
import UseRequestDemo from './UseRequestDemo';
import UseResourceDemo from './UseResourceDemo';
import UseSSEDemo from './UseSSEDemo';

describe('UseAsyncDemo', () => {
  it('shows only the latest search and logs aborted requests', async () => {
    const user = userEvent.setup();
    render(<UseAsyncDemo />);
    await user.type(screen.getByLabelText('Search languages'), 'jav');
    const results = await screen.findByRole('list', { name: 'Results' });
    expect(within(results).getByText('Java')).toBeInTheDocument();
    expect(screen.getByText(/results for “jav”/)).toBeInTheDocument();
    expect(screen.getAllByText(/aborted \(stale\)/).length).toBeGreaterThan(0);
  });

  it('shows errors with a retry button', async () => {
    const user = userEvent.setup();
    render(<UseAsyncDemo />);
    await user.type(screen.getByLabelText('Search languages'), 'error');
    expect(await screen.findByText('Search failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('UseRequestDemo', () => {
  it('shares one request between readers and toggles optimistically', async () => {
    const user = userEvent.setup();
    render(<UseRequestDemo />);
    const todos = await screen.findByRole('list', { name: 'Todos' });
    const first = (await within(todos).findAllByRole('checkbox'))[0]!;
    expect(screen.getAllByText(/of \d+ done/)).toHaveLength(2);
    expect(screen.getByText('Network requests for /api/todos').nextSibling).toHaveTextContent('1');

    const before = (first as HTMLInputElement).checked;
    await user.click(first);
    expect(first).toHaveProperty('checked', !before);
    expect(await screen.findByText('Server confirmed')).toBeInTheDocument();
  });
});

describe('UseResourceDemo', () => {
  it('suspends, renders the product and recovers from a 404 via the boundary', async () => {
    // Suspense data must resolve inside an awaited act() in tests: React only
    // flushes the retry there (user-event's synchronous act is not enough).
    const waitInAct = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));
    const click = (name: string) => act(async () => screen.getByRole('button', { name }).click());

    await act(async () => {
      render(<UseResourceDemo />);
    });
    expect(screen.getByText('Loading product 1…')).toBeInTheDocument();
    await waitInAct(1000);
    expect(screen.getByText('category')).toBeInTheDocument();

    vi.spyOn(console, 'error').mockImplementation(() => {});
    await click('Missing product (404)');
    await waitInAct(1000);
    expect(screen.getByText('Could not load the product')).toBeInTheDocument();

    await click('Product 1');
    expect(screen.getByText('category')).toBeInTheDocument(); // cached: no suspense
  });
});

describe('UseInfiniteScrollDemo', () => {
  it('loads the next page when the sentinel becomes visible, and via the button', async () => {
    const IO = installIntersectionObserver();
    const user = userEvent.setup();
    const { container } = render(<UseInfiniteScrollDemo />);
    const sentinel = container.querySelector('.use-infinite-scroll-demo-sentinel')!;
    IO.triggerAll(sentinel, true);
    IO.triggerAll(sentinel, true); // duplicate notification while loading: ignored
    expect(await screen.findByText(/Loaded 20 of 500 products in 1 requests/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText(/Loaded 40 of 500 products in 2 requests/)).toBeInTheDocument();
  });
});

describe('UsePollingDemo', () => {
  it('shows the first poll and can be stopped', async () => {
    const user = userEvent.setup();
    render(<UsePollingDemo />);
    expect(await screen.findByText('polling')).toBeInTheDocument();
    const table = screen.getByLabelText('Stats');
    await within(table).findByText('1');
    await user.click(screen.getByRole('button', { name: 'Stop polling' }));
    expect(screen.getByText('stopped')).toBeInTheDocument();
  });
});

describe('UseSSEDemo', () => {
  it('explains when EventSource is missing (jsdom)', () => {
    render(<UseSSEDemo />);
    expect(screen.getByText('EventSource is not available')).toBeInTheDocument();
  });

  it('renders events from an EventSource', () => {
    class FakeEventSource extends EventTarget {
      static readonly CLOSED = 2;
      readyState = 0;
      close() {
        this.readyState = 2;
      }
    }
    const sources: FakeEventSource[] = [];
    vi.stubGlobal(
      'EventSource',
      class extends FakeEventSource {
        constructor() {
          super();
          sources.push(this);
        }
      },
    );
    render(<UseSSEDemo />);
    act(() => {
      sources[0]?.dispatchEvent(new Event('open'));
      sources[0]?.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ count: 1, at: 0 }),
          lastEventId: '1',
        }),
      );
    });
    expect(screen.getByText('Tick 1')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
  });
});
