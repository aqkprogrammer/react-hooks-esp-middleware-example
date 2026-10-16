import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installMatchMedia } from '../../../test/browserMocks';
import UsePreferredColorSchemeDemo from './UsePreferredColorSchemeDemo';

afterEach(() => {
  vi.useRealTimers();
});

describe('UsePreferredColorSchemeDemo', () => {
  it('shows the scheme and auto-advances tips without reduced motion', () => {
    vi.useFakeTimers();
    installMatchMedia({ '(prefers-color-scheme: dark)': true });
    render(<UsePreferredColorSchemeDemo />);
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('github-dark')).toBeInTheDocument();
    expect(screen.getByText('Tip 1 of 4')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText('Tip 2 of 4')).toBeInTheDocument();
  });

  it('does not auto-advance when reduced motion is preferred', () => {
    vi.useFakeTimers();
    const media = installMatchMedia({ '(prefers-reduced-motion: reduce)': true });
    render(<UsePreferredColorSchemeDemo />);
    expect(
      screen.getByText(/Auto-advance is off because you prefer reduced motion/),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText('Tip 1 of 4')).toBeInTheDocument();
    media.setMatches('(prefers-reduced-motion: reduce)', false);
    expect(screen.getByText('Advancing every 4 seconds.')).toBeInTheDocument();
  });

  it('has working manual and pause controls', async () => {
    const user = userEvent.setup();
    render(<UsePreferredColorSchemeDemo />);
    expect(screen.getByText('no-preference')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next tip' }));
    expect(screen.getByText('Tip 2 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous tip' }));
    await user.click(screen.getByRole('button', { name: 'Previous tip' }));
    expect(screen.getByText('Tip 4 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause auto-advance' }));
    expect(screen.getByText('Auto-advance paused.')).toBeInTheDocument();
  });
});
