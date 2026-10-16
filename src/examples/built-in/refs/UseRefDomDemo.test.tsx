import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UseRefDomDemo from './UseRefDomDemo';

describe('UseRefDomDemo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the first invalid field on submit', async () => {
    const user = userEvent.setup();
    render(<UseRefDomDemo />);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    const name = screen.getByLabelText('Name');
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription('Name is required');

    await user.type(name, 'Ada');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByLabelText('Email')).toHaveFocus();

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('status')).toHaveTextContent('Signed up Ada <ada@example.com>');
  });

  it('moves focus imperatively from a button', async () => {
    const user = userEvent.setup();
    render(<UseRefDomDemo />);
    await user.click(screen.getByRole('button', { name: 'Focus the email field' }));
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('tracks the previous value', async () => {
    const user = userEvent.setup();
    render(<UseRefDomDemo />);
    await user.click(screen.getByRole('button', { name: '+1' }));
    await user.click(screen.getByRole('button', { name: '+10' }));
    const table = within(screen.getByLabelText('Current and previous value'));
    expect(table.getByText('11')).toBeInTheDocument();
    expect(table.getByText('1')).toBeInTheDocument();
    const log = within(screen.getByRole('log', { name: 'Changes' }));
    expect(log.getByText(/changed from 0 to 1/)).toBeInTheDocument();
    expect(log.getByText(/changed from 1 to 11/)).toBeInTheDocument();
  });

  it('starts and stops an interval whose id lives in a ref, and clears it on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<UseRefDomDemo />);
    const table = within(screen.getByLabelText('Auto-saver'));

    fireEvent.click(screen.getByRole('button', { name: 'Start auto-save' }));
    act(() => vi.advanceTimersByTime(3000));
    expect(table.getByText('3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stop auto-save' }));
    act(() => vi.advanceTimersByTime(3000));
    expect(table.getByText('3')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Start auto-save' }));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
