import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseScrollPositionDemo from './UseScrollPositionDemo';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('UseScrollPositionDemo', () => {
  it('reports the element scroll offset and scrolls back to top', () => {
    render(<UseScrollPositionDemo />);
    const region = screen.getByRole('region', { name: 'Scrollable article' });
    region.scrollTop = 150;
    fireEvent.scroll(region);
    act(() => vi.advanceTimersToNextFrame());
    expect(screen.getByText('150px')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /Back to top/ });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    fireEvent.scroll(region);
    act(() => vi.advanceTimersToNextFrame());
    expect(region.scrollTop).toBe(0);
    expect(screen.getByRole('button', { name: /Back to top/ })).toBeDisabled();
  });
});
