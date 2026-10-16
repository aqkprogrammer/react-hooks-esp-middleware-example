import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseEffectWebSocketDemo from './UseEffectWebSocketDemo';

describe('UseEffectWebSocketDemo', () => {
  it('connects to the mocked socket and exchanges messages', async () => {
    const user = userEvent.setup();
    render(<UseEffectWebSocketDemo />);
    expect(await screen.findByText('open')).toBeInTheDocument();
    const log = screen.getByRole('log', { name: 'Socket log' });
    expect(await within(log).findByText(/← welcome/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send ping' }));
    expect(await within(log).findByText(/← pong/)).toBeInTheDocument();

    const text = screen.getByLabelText('Notification text');
    await user.clear(text);
    await user.type(text, 'Deploy finished');
    await user.click(screen.getByRole('button', { name: 'Send notification' }));
    const list = screen.getByRole('list', { name: 'Notifications' });
    expect(await within(list).findByText('#general: Deploy finished')).toBeInTheDocument();
  });

  it('closes the old socket before connecting to a new channel, and on unmount', async () => {
    const user = userEvent.setup();
    render(<UseEffectWebSocketDemo />);
    expect(await screen.findByText('open')).toBeInTheDocument();
    const log = screen.getByRole('log', { name: 'Socket log' });

    await user.click(screen.getByRole('button', { name: '#random' }));
    expect(within(log).getByText(/cleanup: closed #general/)).toBeInTheDocument();
    expect(await within(log).findByText(/open \(#random\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unmount the client' }));
    expect(within(log).getByText(/cleanup: closed #random/)).toBeInTheDocument();
    expect(screen.getByText(/the effect cleanup closed the socket/)).toBeInTheDocument();
  });
});
