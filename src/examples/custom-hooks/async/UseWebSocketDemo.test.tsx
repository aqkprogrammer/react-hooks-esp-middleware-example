import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseWebSocketDemo from './UseWebSocketDemo';

describe('UseWebSocketDemo', () => {
  it('connects to the mock server, sends ping/notify and shows replies', async () => {
    const user = userEvent.setup();
    render(<UseWebSocketDemo />);
    const messages = screen.getByRole('list', { name: 'Messages' });
    expect(await within(messages).findByText(/welcome/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send ping' }));
    expect(await within(messages).findByText('pong')).toBeInTheDocument();

    const field = screen.getByLabelText('Notification text');
    await user.clear(field);
    await user.type(field, 'Build green');
    await user.click(screen.getByRole('button', { name: 'Send notify' }));
    expect(await within(messages).findByText('Notification: Build green')).toBeInTheDocument();
  });

  it('closes on purpose and refuses to send while closed', async () => {
    const user = userEvent.setup();
    render(<UseWebSocketDemo />);
    await screen.findByText(/welcome/);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(await screen.findByText('closed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send ping' }));
    expect(screen.getByText('Not sent: the socket is closed')).toBeInTheDocument();
  });
});
