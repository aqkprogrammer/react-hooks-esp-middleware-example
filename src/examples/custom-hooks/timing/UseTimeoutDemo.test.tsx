import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseTimeoutDemo from './UseTimeoutDemo';

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('UseTimeoutDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-dismisses the toast', () => {
    render(<UseTimeoutDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByText('Changes saved')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    advance(4000);
    expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Timer state')).toHaveTextContent('Auto-dismissed1');
  });

  it('keeps the toast open when cleared and resumes with start', () => {
    render(<UseTimeoutDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep open (clear)' }));
    advance(10000);
    expect(screen.getByText('Changes saved')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume (start)' }));
    advance(4000);
    expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
  });

  it('pauses while the pointer is over the toast and restarts with reset', () => {
    render(<UseTimeoutDemo />);
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    const toast = screen.getByText('This message closes by itself.');
    fireEvent.pointerEnter(toast);
    advance(6000);
    expect(toast).toBeInTheDocument();
    fireEvent.pointerLeave(toast);
    advance(3000);
    fireEvent.click(screen.getByRole('button', { name: 'Show again (reset timer)' }));
    advance(3000);
    expect(screen.getByText('Changes saved')).toBeInTheDocument();
    advance(1000);
    expect(screen.queryByText('Changes saved')).not.toBeInTheDocument();
  });
});
