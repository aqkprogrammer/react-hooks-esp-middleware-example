import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExternalStoreDemo from './ExternalStoreDemo';

const commits = (label: string) =>
  Number(screen.getByText(`${label} commits:`).querySelector('span')?.textContent?.split(' ')[0]);

describe('ExternalStoreDemo', () => {
  afterEach(() => vi.useRealTimers());

  it('re-renders only the tile whose slice changed', async () => {
    const user = userEvent.setup();
    render(<ExternalStoreDemo />);
    const gbpBefore = commits('GBPUSD');
    const eurBefore = commits('EURUSD');
    await user.click(screen.getByRole('button', { name: 'Tick EURUSD' }));
    expect(screen.getByLabelText('EURUSD bid')).not.toHaveTextContent('1.0842');
    expect(screen.getByText('▼ down')).toBeInTheDocument();
    expect(commits('EURUSD')).toBe(eurBefore + 1);
    expect(commits('GBPUSD')).toBe(gbpBefore);
    expect(screen.getByRole('status')).toHaveTextContent('Ticks: 1');
    expect(screen.getByRole('log')).toHaveTextContent('tick EURUSD → tick #1');
  });

  it('accepts dispatches from a timer outside React and stops on toggle', () => {
    vi.useFakeTimers();
    render(<ExternalStoreDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Start price feed' }));
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByRole('status')).toHaveTextContent('Ticks: 3');
    fireEvent.click(screen.getByRole('button', { name: 'Stop price feed' }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('status')).toHaveTextContent('Ticks: 3');
    fireEvent.click(screen.getByRole('button', { name: 'Reset prices' }));
    expect(screen.getByRole('status')).toHaveTextContent('Ticks: 0');
  });
});
