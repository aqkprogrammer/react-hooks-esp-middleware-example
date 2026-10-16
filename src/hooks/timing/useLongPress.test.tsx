import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLongPress, type UseLongPressOptions } from './useLongPress';

function Target({
  onLongPress,
  options,
}: {
  onLongPress: () => void;
  options?: UseLongPressOptions<HTMLButtonElement>;
}) {
  const handlers = useLongPress<HTMLButtonElement>(onLongPress, options);
  return (
    <button type="button" {...handlers}>
      Hold me
    </button>
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const button = () => screen.getByRole('button', { name: 'Hold me' });
const pointer = { isPrimary: true, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 };

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the threshold and reports start/finish', () => {
    const onLongPress = vi.fn();
    const onStart = vi.fn();
    const onFinish = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ threshold: 300, onStart, onFinish }} />);
    fireEvent.pointerDown(button(), pointer);
    expect(onStart).toHaveBeenCalledTimes(1);
    advance(299);
    expect(onLongPress).not.toHaveBeenCalled();
    advance(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(button(), pointer);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('cancels when released early, moved too far, or left', () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ onCancel }} />);

    fireEvent.pointerDown(button(), pointer);
    advance(200);
    fireEvent.pointerUp(button(), pointer);

    fireEvent.pointerDown(button(), pointer);
    fireEvent.pointerMove(button(), { ...pointer, clientX: 40 });

    fireEvent.pointerDown(button(), pointer);
    fireEvent.pointerLeave(button(), pointer);

    advance(1000);
    expect(onLongPress).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it('tolerates small pointer movement', () => {
    const onLongPress = vi.fn();
    render(<Target onLongPress={onLongPress} />);
    fireEvent.pointerDown(button(), pointer);
    fireEvent.pointerMove(button(), { ...pointer, clientX: 14, clientY: 13 });
    advance(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ignores secondary mouse buttons and disabled presses', () => {
    const onLongPress = vi.fn();
    const { rerender } = render(<Target onLongPress={onLongPress} />);
    fireEvent.pointerDown(button(), { ...pointer, button: 2 });
    advance(600);
    rerender(<Target onLongPress={onLongPress} options={{ disabled: true }} />);
    fireEvent.pointerDown(button(), pointer);
    advance(600);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('supports holding Space or Enter and ignores key repeat', () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ onCancel }} />);
    fireEvent.keyDown(button(), { key: ' ' });
    fireEvent.keyDown(button(), { key: ' ', repeat: true });
    advance(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(button(), { key: ' ' });

    fireEvent.keyDown(button(), { key: 'Enter' });
    advance(100);
    fireEvent.keyUp(button(), { key: 'Enter' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(button(), { key: 'a' });
    advance(600);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('can disable keyboard support', () => {
    const onLongPress = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ keyboard: false }} />);
    fireEvent.keyDown(button(), { key: 'Enter' });
    advance(600);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('suppresses the context menu only during a press', () => {
    render(<Target onLongPress={() => {}} />);
    expect(fireEvent.contextMenu(button())).toBe(true);
    fireEvent.pointerDown(button(), { ...pointer, pointerType: 'touch' });
    expect(fireEvent.contextMenu(button())).toBe(false);
  });

  it('recovers when a press never receives its pointerup', () => {
    const onLongPress = vi.fn();
    const onFinish = vi.fn();
    render(<Target onLongPress={onLongPress} options={{ onFinish }} />);
    fireEvent.pointerDown(button(), pointer);
    advance(500);
    // No pointerup (e.g. the element re-mounted) — the next press still works.
    fireEvent.pointerDown(button(), pointer);
    expect(onFinish).toHaveBeenCalledTimes(1);
    advance(500);
    expect(onLongPress).toHaveBeenCalledTimes(2);
  });

  it('clears the timer on unmount', () => {
    const onLongPress = vi.fn();
    const { unmount } = render(<Target onLongPress={onLongPress} />);
    fireEvent.pointerDown(button(), pointer);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    advance(1000);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
