import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { EspDemo } from './EspDemo';

function setup() {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <EspDemo />
    </StrictMode>,
  );
  const accumulators = screen.getByRole('article', { name: /Accumulators Tile/ });
  const price = screen.getByRole('article', { name: /Price Tile/ });
  return { user, accumulators, price };
}

describe('original esp-js workspace demo (migrated)', () => {
  it('publishes Delete only to the accumulators model', async () => {
    const { user, accumulators, price } = setup();
    expect(within(accumulators).getByText('Accumulator List: 2')).toBeInTheDocument();

    await user.click(within(accumulators).getByRole('button', { name: 'Delete (Publish)' }));

    expect(within(accumulators).getByText('Accumulator List: 1')).toBeInTheDocument();
    expect(within(accumulators).queryByText('Some Accumulator')).not.toBeInTheDocument();
    // Published events reach only the publishing model.
    expect(within(price).getByText('none yet')).toBeInTheDocument();
  });

  it('broadcasts Insert to every tile that observes KEY_PRESSED', async () => {
    const { user, accumulators, price } = setup();
    await user.type(within(accumulators).getByLabelText('Accumulator'), 'Range Accrual');
    await user.click(within(accumulators).getByRole('button', { name: 'Insert (Broadcast)' }));

    expect(
      within(accumulators).getByRole('button', { name: 'Remove Range Accrual' }),
    ).toBeInTheDocument();
    expect(within(accumulators).getByText('Accumulator List: 3')).toBeInTheDocument();
    expect(within(price).getByText('Insert')).toBeInTheDocument();
    expect(within(price).getAllByText('dtp-client-common_keyPressed').length).toBeGreaterThan(0);
  });

  it('handles the Insert key from the keyboard', async () => {
    const { user, accumulators } = setup();
    await user.type(within(accumulators).getByLabelText('Accumulator'), 'Keyboard{Insert}');
    expect(
      within(accumulators).getByRole('button', { name: 'Remove Keyboard' }),
    ).toBeInTheDocument();
  });

  it('reports duplicates inline instead of alert()', async () => {
    const { user, accumulators } = setup();
    await user.type(within(accumulators).getByLabelText('Accumulator'), 'Some Accumulator');
    await user.click(within(accumulators).getByRole('button', { name: /Add Accumulator/ }));
    expect(within(accumulators).getByRole('status')).toHaveTextContent('already in the list');
  });

  it('runs the validation middleware before the login middleware', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Username'), 'ab');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.getByText('Min username length is 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('logs in through the mocked API and logs out', async () => {
    const { user, price } = setup();
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('UserToken: demo-token-ada')).toBeInTheDocument();
    expect(within(price).getByText('Logged In')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.queryByText(/UserToken/)).not.toBeInTheDocument();
  });

  it('shows login failures from the API', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Username'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('persists the theme through the localStorage middleware', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Badger' }));
    expect(screen.getByRole('button', { name: 'Badger' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('themeClassName')).toBe('badger');
  });

  it('streams prices with RxJS and unsubscribes', async () => {
    const { user, price } = setup();
    await user.click(within(price).getByRole('button', { name: 'Add Pair' }));
    expect(
      await within(price).findByRole('button', { name: 'Unsubscribe gbpusd' }),
    ).toBeInTheDocument();
    await user.click(within(price).getByRole('button', { name: 'Unsubscribe All' }));
    expect(
      within(price).queryByRole('button', { name: 'Unsubscribe gbpusd' }),
    ).not.toBeInTheDocument();
  });

  it('counts clicks in the price tile reducer', async () => {
    const { user, price } = setup();
    await user.click(within(price).getByRole('button', { name: 'Click' }));
    await user.click(within(price).getByRole('button', { name: 'Click' }));
    expect(within(price).getByText('Click Count: 2')).toBeInTheDocument();
  });
});
