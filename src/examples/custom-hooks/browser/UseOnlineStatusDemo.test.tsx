import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { overrideProperty, setOnline } from '../../../test/browserMocks';
import UseOnlineStatusDemo from './UseOnlineStatusDemo';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

describe('UseOnlineStatusDemo', () => {
  it('shows an offline banner and logs online/offline events', () => {
    render(<UseOnlineStatusDemo />);
    expect(screen.getByRole('status')).toHaveTextContent('online');
    restores.push(setOnline(false));
    expect(screen.getByRole('status')).toHaveTextContent('offline');
    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.getByText(/offline event/)).toBeInTheDocument();
    restores.push(setOnline(true));
    expect(screen.queryByText('You are offline')).not.toBeInTheDocument();
  });

  it('explains that the Network Information API is Chromium-only', () => {
    render(<UseOnlineStatusDemo />);
    expect(screen.getByText('not supported')).toBeInTheDocument();
    expect(screen.getByText('Chromium only')).toBeInTheDocument();
  });

  it('shows connection estimates when supported', () => {
    const connection = Object.assign(new EventTarget(), {
      effectiveType: '3g',
      downlink: 1.45,
      rtt: 300,
      saveData: true,
    });
    restores.push(overrideProperty(navigator, 'connection', connection));
    render(<UseOnlineStatusDemo />);
    expect(screen.getByText('3g')).toBeInTheDocument();
    expect(screen.getByText('1.45 Mbit/s')).toBeInTheDocument();
    expect(screen.getByText('300 ms')).toBeInTheDocument();
  });
});
