import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UseLongPressDemo from './UseLongPressDemo';

const pointer = { isPrimary: true, pointerType: 'mouse', button: 0, clientX: 5, clientY: 5 };
const target = () => screen.getByRole('button', { name: 'Hold to delete draft' });

describe('UseLongPressDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Keep rAF inert: the progress bar animation is not under test here.
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => vi.useRealTimers());

  it('deletes after a long pointer press and can be restored', () => {
    render(<UseLongPressDemo />);
    fireEvent.pointerDown(target(), pointer);
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText('Draft deleted')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('long press via pointer');
    fireEvent.click(screen.getByRole('button', { name: 'Restore draft' }));
    expect(target()).toBeInTheDocument();
  });

  it('cancels a short press', () => {
    render(<UseLongPressDemo />);
    fireEvent.pointerDown(target(), pointer);
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerUp(target(), pointer);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText('Draft deleted')).not.toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('released too early — cancelled');
  });

  it('works by holding Space', () => {
    render(<UseLongPressDemo />);
    fireEvent.keyDown(target(), { key: ' ' });
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText('Draft deleted')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveTextContent('long press via keyboard');
  });
});
