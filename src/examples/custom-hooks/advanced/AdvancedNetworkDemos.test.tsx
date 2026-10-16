import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseFeatureFlagDemo from './UseFeatureFlagDemo';
import UseOptimisticMutationDemo from './UseOptimisticMutationDemo';
import UseStateMachineDemo from './UseStateMachineDemo';

const currentState = () =>
  within(screen.getByRole('list', { name: 'Machine states' })).getByText(
    (_text, element) => element?.getAttribute('aria-current') === 'step',
  ).textContent;

describe('UseStateMachineDemo', () => {
  it('retries through failures until success (mock API)', async () => {
    const user = userEvent.setup();
    render(<UseStateMachineDemo />);
    await user.selectOptions(screen.getByLabelText('Server failures before success'), '1');
    expect(screen.getByRole('button', { name: 'retry' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Fetch' }));
    expect(currentState()).toBe('loading');
    await waitFor(() => expect(currentState()).toBe('failure'), { timeout: 3000 });

    await user.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(currentState()).toBe('success'), { timeout: 3000 });
    expect(screen.getByText('Succeeded on attempt 2')).toBeInTheDocument();
  });

  it('cancelling aborts the request via the entry cleanup', async () => {
    const user = userEvent.setup();
    render(<UseStateMachineDemo />);
    await user.click(screen.getByRole('button', { name: 'Fetch' }));
    await user.click(screen.getByRole('button', { name: 'cancel' }));
    expect(currentState()).toBe('idle');
    expect(screen.getByText('Cancelled (request aborted)')).toBeInTheDocument();
  });

  it('the guard blocks retries after the limit', async () => {
    const user = userEvent.setup();
    render(<UseStateMachineDemo />);
    await user.selectOptions(screen.getByLabelText('Server failures before success'), '5');
    await user.click(screen.getByRole('button', { name: 'Fetch' }));
    for (let attempt = 1; attempt < 3; attempt += 1) {
      await waitFor(() => expect(currentState()).toBe('failure'), { timeout: 3000 });
      await user.click(screen.getByRole('button', { name: 'retry' }));
    }
    await waitFor(() => expect(currentState()).toBe('failure'), { timeout: 3000 });
    expect(screen.getByText('Guard blocked RETRY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'retry' })).toBeDisabled();
  });
});

describe('UseFeatureFlagDemo', () => {
  it('starts from defaults, applies remote flags and local overrides', async () => {
    const user = userEvent.setup();
    render(<UseFeatureFlagDemo />);
    expect(screen.getByText('Classic three-step checkout')).toBeInTheDocument();

    expect(await screen.findByText('New one-page checkout')).toBeInTheDocument();
    expect(screen.getByText(/Search mode in use/)).toHaveTextContent('fuzzy');

    await user.click(screen.getByRole('checkbox', { name: 'newCheckout' }));
    expect(screen.getByText('Classic three-step checkout')).toBeInTheDocument();
    expect(screen.getByText('override')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear local overrides' }));
    expect(screen.getByText('New one-page checkout')).toBeInTheDocument();
  });

  it('falls back to defaults during an outage', async () => {
    const user = userEvent.setup();
    render(<UseFeatureFlagDemo />);
    await screen.findByText('New one-page checkout');
    await user.click(screen.getByRole('checkbox', { name: 'Simulate a flag-service outage' }));
    expect(await screen.findByText('Remote flags unavailable')).toBeInTheDocument();
    // Last good remote values are kept; the error is surfaced.
    expect(screen.getByText(/Flag service responded 503/)).toBeInTheDocument();
  });
});

describe('UseOptimisticMutationDemo', () => {
  it('shows the toggle immediately, then confirms it', async () => {
    const user = userEvent.setup();
    render(<UseOptimisticMutationDemo />);
    const list = await screen.findByRole('list', { name: 'Todos' });
    const first = within(list).getAllByRole('checkbox')[0]!;
    const before = (first as HTMLInputElement).checked;

    await user.click(first);
    expect(first).toHaveProperty('checked', !before);
    expect(within(list).getByText('saving…')).toBeInTheDocument();
    await waitFor(() => expect(within(list).queryByText('saving…')).toBeNull(), {
      timeout: 3000,
    });
    expect(first).toHaveProperty('checked', !before);
  });

  it('rolls back when the server fails', async () => {
    const user = userEvent.setup();
    render(<UseOptimisticMutationDemo />);
    const list = await screen.findByRole('list', { name: 'Todos' });
    await user.click(screen.getByRole('checkbox', { name: 'Make the server fail (rollback)' }));
    const first = within(list).getAllByRole('checkbox')[0]!;
    const before = (first as HTMLInputElement).checked;

    await user.click(first);
    expect(first).toHaveProperty('checked', !before);
    expect(
      await screen.findByText('Change rolled back', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(first).toHaveProperty('checked', before);
  });
});
