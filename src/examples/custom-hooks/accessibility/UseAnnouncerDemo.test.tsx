import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseAnnouncerDemo from './UseAnnouncerDemo';

const region = (politeness: string) =>
  document.querySelector(`[data-live-announcer="${politeness}"]`) as HTMLElement;

describe('UseAnnouncerDemo', () => {
  it('announces cart updates politely and errors assertively', async () => {
    const user = userEvent.setup();
    render(<UseAnnouncerDemo />);
    await user.click(screen.getByRole('button', { name: 'Add Grinder to cart' }));
    await waitFor(() =>
      expect(region('polite')).toHaveTextContent('Grinder added. Cart has 1 item.'),
    );
    expect(screen.getByText('Cart: 1 items')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Simulate payment error' }));
    await waitFor(() =>
      expect(region('assertive')).toHaveTextContent('Payment failed: your card was declined.'),
    );
    const log = within(screen.getByRole('log', { name: 'Announced' }));
    expect(log.getByText(/\[assertive\] Payment failed/)).toBeInTheDocument();
  });

  it('announces a custom message with the chosen politeness and clears regions', async () => {
    const user = userEvent.setup();
    render(<UseAnnouncerDemo />);
    await user.clear(screen.getByLabelText('Message'));
    await user.type(screen.getByLabelText('Message'), 'Upload complete');
    await user.click(screen.getByRole('radio', { name: 'assertive' }));
    await user.click(screen.getByRole('button', { name: 'Announce' }));
    await waitFor(() => expect(region('assertive')).toHaveTextContent('Upload complete'));
    await user.click(screen.getByRole('button', { name: 'Clear live regions' }));
    expect(region('assertive')).toHaveTextContent('');
  });

  it('removes the shared live regions on unmount', () => {
    const { unmount } = render(<UseAnnouncerDemo />);
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(2);
    unmount();
    expect(document.querySelectorAll('[data-live-announcer]')).toHaveLength(0);
  });
});
