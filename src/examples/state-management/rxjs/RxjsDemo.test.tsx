import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/server';
import RxjsDemo from './RxjsDemo';

const row = (label: string) =>
  within(screen.getByLabelText('Stream state')).getByText(label).nextElementSibling;

describe('RxjsDemo', () => {
  it('debounces typing into a single request and shows the results', async () => {
    const user = userEvent.setup();
    render(<RxjsDemo />);
    await user.type(screen.getByLabelText('Search languages'), 'rust');
    expect(screen.getByLabelText('Search languages')).toHaveValue('rust');
    expect(
      await within(screen.getByRole('list', { name: 'Results' })).findByText('Rust'),
    ).toBeInTheDocument();
    expect(row('requests sent')).toHaveTextContent('1');
    expect(row('status')).toHaveTextContent('success');
  });

  it('surfaces errors and recovers on the next query', async () => {
    const user = userEvent.setup();
    render(<RxjsDemo />);
    await user.type(screen.getByLabelText('Search languages'), 'error');
    expect(await screen.findByText('Search service unavailable')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search languages'));
    await user.type(screen.getByLabelText('Search languages'), 'go');
    expect(
      await within(screen.getByRole('list', { name: 'Results' })).findByText('Go'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Search failed')).not.toBeInTheDocument();
  });

  it('stops the pipeline on unmount', async () => {
    let searches = 0;
    const onRequest = ({ request }: { request: Request }) => {
      if (new URL(request.url).pathname === '/api/search') searches += 1;
    };
    server.events.on('request:start', onRequest);
    try {
      const user = userEvent.setup();
      const { unmount } = render(<RxjsDemo />);
      await user.type(screen.getByLabelText('Search languages'), 'ja');
      unmount(); // within the 300 ms debounce window
      await new Promise((resolve) => setTimeout(resolve, 450));
      expect(searches).toBe(0);
    } finally {
      server.events.removeListener('request:start', onRequest);
    }
  });
});
