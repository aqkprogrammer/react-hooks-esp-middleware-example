import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseDebounceDemo from './UseDebounceDemo';

describe('UseDebounceDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('searches only after typing pauses', () => {
    render(<UseDebounceDemo />);
    const input = screen.getByLabelText('Search languages');
    fireEvent.change(input, { target: { value: 'r' } });
    fireEvent.change(input, { target: { value: 'ru' } });
    fireEvent.change(input, { target: { value: 'rus' } });

    const values = screen.getByLabelText('Values');
    expect(values).toHaveTextContent('Raw value"rus"');
    expect(values).toHaveTextContent('Debounced value""');
    expect(values).toHaveTextContent('waiting…');

    act(() => vi.advanceTimersByTime(300));
    expect(values).toHaveTextContent('Debounced value"rus"');
    expect(values).toHaveTextContent('Keystrokes3');
    expect(values).toHaveTextContent('Searches run1');
    expect(screen.getByRole('list', { name: 'Results' })).toHaveTextContent('Rust');
  });

  it('uses the selected delay', () => {
    render(<UseDebounceDemo />);
    fireEvent.change(screen.getByLabelText('Delay'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('Search languages'), { target: { value: 'go' } });
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByLabelText('Values')).toHaveTextContent('Debounced value""');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByLabelText('Values')).toHaveTextContent('Debounced value"go"');
  });
});
