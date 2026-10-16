import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseDebouncedCallbackDemo from './UseDebouncedCallbackDemo';

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText('Note'), { target: { value } });

describe('UseDebouncedCallbackDemo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('autosaves after a pause', () => {
    render(<UseDebouncedCallbackDemo />);
    type('hello');
    expect(screen.getByText('unsaved changes')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('all saved')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('saved 5 characters');
  });

  it('saves at least every 3 s while typing continuously (maxWait)', () => {
    render(<UseDebouncedCallbackDemo />);
    for (let i = 1; i <= 8; i += 1) {
      type('x'.repeat(i));
      act(() => vi.advanceTimersByTime(500));
    }
    expect(screen.getByLabelText('Autosave state')).toHaveTextContent('Save calls1');
  });

  it('flushes on "Save now" and cancels on "Discard"', () => {
    render(<UseDebouncedCallbackDemo />);
    type('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Save now (flush)' }));
    expect(screen.getByText('all saved')).toBeInTheDocument();

    type('draft that will be discarded');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes (cancel)' }));
    expect(screen.getByLabelText('Note')).toHaveValue('draft');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByLabelText('Autosave state')).toHaveTextContent('Save calls1');
    expect(screen.getByRole('log')).toHaveTextContent('discarded the pending save');
  });
});
