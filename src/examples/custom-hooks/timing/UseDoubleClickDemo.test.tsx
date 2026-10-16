import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseDoubleClickDemo from './UseDoubleClickDemo';

describe('UseDoubleClickDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('selects on a single click and opens on a double click', () => {
    render(<UseDoubleClickDemo />);
    const report = screen.getByRole('button', { name: 'report.pdf' });
    fireEvent.click(report);
    expect(report).toHaveAttribute('aria-pressed', 'false');
    act(() => vi.advanceTimersByTime(250));
    expect(report).toHaveAttribute('aria-pressed', 'true');

    const photo = screen.getByRole('button', { name: 'photo.jpg' });
    fireEvent.click(photo);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(photo);
    expect(screen.getByText('Currently open: photo.jpg')).toBeInTheDocument();
    expect(screen.getByRole('log')).not.toHaveTextContent('selected photo.jpg');
  });

  it('offers a non-double-click way to open', () => {
    render(<UseDoubleClickDemo />);
    expect(screen.getByRole('button', { name: 'Open selected' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'notes.txt' }));
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole('button', { name: 'Open selected' }));
    expect(screen.getByText('Currently open: notes.txt')).toBeInTheDocument();
  });
});
