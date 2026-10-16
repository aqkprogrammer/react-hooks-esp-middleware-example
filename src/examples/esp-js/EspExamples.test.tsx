import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EspErrorIsolationDemo from './EspErrorIsolationDemo';
import EspStagesDemo from './EspStagesDemo';
import EspVsReducerDemo from './EspVsReducerDemo';

describe('esp-js examples', () => {
  it('cancels events above the risk limit at the preview stage', async () => {
    const user = userEvent.setup();
    render(<EspStagesDemo />);
    const quantity = screen.getByLabelText('Quantity');
    await user.clear(quantity);
    await user.type(quantity, '500');
    await user.click(screen.getByRole('button', { name: 'Publish ORDER_PLACED' }));
    expect(screen.getByText('Orders in reducer state').nextSibling).toHaveTextContent('0');
    expect(screen.getByRole('log')).toHaveTextContent('canceled');

    await user.clear(quantity);
    await user.type(quantity, '5');
    await user.click(screen.getByRole('button', { name: 'Publish ORDER_PLACED' }));
    expect(screen.getByText('Orders in reducer state').nextSibling).toHaveTextContent('1');
    expect(screen.getByRole('log')).toHaveTextContent('committed');
  });

  it('keeps the router alive when a reducer throws', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<EspErrorIsolationDemo />);
    await user.click(screen.getByRole('button', { name: /POISON/ }));
    await user.click(screen.getByRole('button', { name: 'Publish PING' }));
    expect(screen.getByText('PINGs handled').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Router status').nextSibling).not.toHaveTextContent('halted');
    expect(screen.getByRole('list', { name: 'Reported errors' })).toHaveTextContent(
      'Reducer crashed',
    );
  });

  it('broadcast reaches every esp store but not the plain reducer', async () => {
    const user = userEvent.setup();
    render(<EspVsReducerDemo />);
    await user.click(screen.getByRole('button', { name: 'Broadcast +10 from Tile A' }));
    await user.click(screen.getByRole('button', { name: 'Publish Tile B' }));
    const counts = screen.getAllByText('count').map((dt) => dt.nextSibling?.textContent);
    expect(counts).toEqual(['0', '10', '11']);
    const tileA = screen.getByRole('region', { name: 'Tile A (esp-js)' });
    await user.click(within(tileA).getByRole('button', { name: 'Local dispatch Tile A' }));
    expect(within(tileA).getByText('11')).toBeInTheDocument();
  });
});
