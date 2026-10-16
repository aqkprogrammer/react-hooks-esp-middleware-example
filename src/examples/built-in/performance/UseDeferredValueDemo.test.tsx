import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UseDeferredValueDemo from './UseDeferredValueDemo';

/** Types into an input the way a browser does, without wrapping it in act(). */
function typeNatively(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const searchPanel = () => screen.getByRole('region', { name: 'Deferred search over 3,000 rows' });

describe('UseDeferredValueDemo', () => {
  it('filters the list once the deferred value catches up', async () => {
    const user = userEvent.setup();
    render(<UseDeferredValueDemo />);
    expect(screen.getByText('3000 matches for “”')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search people'), 'radia');
    expect(screen.getByText('150 matches for “radia”')).toBeInTheDocument();
    expect(within(searchPanel()).getByText('Up to date')).toBeInTheDocument();
  });

  it('keeps showing (dimmed) stale results while the new list renders', async () => {
    render(<UseDeferredValueDemo />);
    // Outside act() React schedules work like a browser, so the urgent render
    // (input + stale badge) commits before the deferred list render.
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
    typeNatively(screen.getByLabelText<HTMLInputElement>('Search people'), 'ken');

    await waitFor(() =>
      expect(
        within(searchPanel()).queryByText('Stale — still showing results for “”'),
      ).not.toBeNull(),
    );
    expect(within(searchPanel()).getByText('3000 matches for “”')).toBeInTheDocument();
    await waitFor(() => expect(within(searchPanel()).queryByText('Up to date')).not.toBeNull(), {
      timeout: 3000,
    });
    expect(within(searchPanel()).getByText('150 matches for “ken”')).toBeInTheDocument();
  });

  it('renders the list with the urgent value when deferring is off', async () => {
    const user = userEvent.setup();
    render(<UseDeferredValueDemo />);
    await user.click(screen.getByLabelText('Render the list with useDeferredValue'));
    await user.type(screen.getByLabelText('Search people'), 'tim');
    expect(screen.getByText('150 matches for “tim”')).toBeInTheDocument();
  });

  it('shows the initialValue placeholder first after a remount', async () => {
    render(<UseDeferredValueDemo />);
    expect(screen.getByText('Summary ready: 3000 people match “”.')).toBeInTheDocument();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
    screen.getByRole('button', { name: 'Remount summary' }).click();
    await waitFor(() => expect(screen.queryByText('Preparing summary…')).not.toBeNull());
    await waitFor(() =>
      expect(screen.queryByText('Summary ready: 3000 people match “”.')).not.toBeNull(),
    );
  });
});
