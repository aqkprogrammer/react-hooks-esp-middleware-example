import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDoubleClick } from './useDoubleClick';

function Target({
  onSingleClick,
  onDoubleClick,
  delay,
}: {
  onSingleClick: () => void;
  onDoubleClick: () => void;
  delay?: number;
}) {
  const { onClick } = useDoubleClick<HTMLButtonElement>({ onSingleClick, onDoubleClick, delay });
  return (
    <button type="button" onClick={onClick}>
      Item
    </button>
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('useDoubleClick', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports a single click only after the delay', () => {
    const single = vi.fn();
    const double = vi.fn();
    render(<Target onSingleClick={single} onDoubleClick={double} delay={200} />);
    fireEvent.click(screen.getByRole('button'));
    advance(199);
    expect(single).not.toHaveBeenCalled();
    advance(1);
    expect(single).toHaveBeenCalledTimes(1);
    expect(double).not.toHaveBeenCalled();
  });

  it('reports a double click and drops the pending single click', () => {
    const single = vi.fn();
    const double = vi.fn();
    render(<Target onSingleClick={single} onDoubleClick={double} />);
    fireEvent.click(screen.getByRole('button'));
    advance(100);
    fireEvent.click(screen.getByRole('button'));
    advance(1000);
    expect(double).toHaveBeenCalledTimes(1);
    expect(single).not.toHaveBeenCalled();
  });

  it('treats slow clicks as two single clicks', () => {
    const single = vi.fn();
    const double = vi.fn();
    render(<Target onSingleClick={single} onDoubleClick={double} delay={200} />);
    fireEvent.click(screen.getByRole('button'));
    advance(300);
    fireEvent.click(screen.getByRole('button'));
    advance(300);
    expect(single).toHaveBeenCalledTimes(2);
    expect(double).not.toHaveBeenCalled();
  });

  it('calls the latest callbacks', () => {
    const stale = vi.fn();
    const fresh = vi.fn();
    const { rerender } = render(<Target onSingleClick={stale} onDoubleClick={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<Target onSingleClick={fresh} onDoubleClick={() => {}} />);
    advance(300);
    expect(fresh).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });

  it('clears the pending single click on unmount', () => {
    const single = vi.fn();
    const { unmount } = render(<Target onSingleClick={single} onDoubleClick={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    advance(500);
    expect(single).not.toHaveBeenCalled();
  });
});
