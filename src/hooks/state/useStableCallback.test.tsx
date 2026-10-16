import { act, render, renderHook, screen } from '@testing-library/react';
import { memo, useLayoutEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useStableCallback } from './useStableCallback';

describe('useStableCallback', () => {
  it('keeps one identity and calls the latest callback', () => {
    const first = vi.fn((n: number) => n + 1);
    const second = vi.fn((n: number) => n * 10);
    const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
      initialProps: { fn: first },
    });
    const stable = result.current;
    rerender({ fn: second });
    expect(result.current).toBe(stable);
    expect(stable(2)).toBe(20);
    expect(first).not.toHaveBeenCalled();
  });

  it('lets memoized children skip re-renders while seeing fresh state', () => {
    const childRenders = vi.fn();
    const Child = memo(function Child({ onReport }: { onReport: () => void }) {
      childRenders();
      return (
        <button type="button" onClick={onReport}>
          report
        </button>
      );
    });
    const reported: number[] = [];
    function Parent() {
      const [count, setCount] = useState(0);
      const report = useStableCallback(() => reported.push(count));
      return (
        <>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            inc
          </button>
          <Child onReport={report} />
        </>
      );
    }
    render(<Parent />);
    act(() => screen.getByText('inc').click());
    act(() => screen.getByText('inc').click());
    act(() => screen.getByText('report').click());
    expect(reported).toEqual([2]);
    expect(childRenders).toHaveBeenCalledTimes(1);
  });

  it('is already up to date inside child layout effects', () => {
    const seen: string[] = [];
    function Child({ onMount }: { onMount: () => void }) {
      useLayoutEffect(() => {
        onMount();
      });
      return null;
    }
    function Parent({ label }: { label: string }) {
      const callback = useStableCallback(() => seen.push(label));
      return <Child onMount={callback} />;
    }
    const { rerender } = render(<Parent label="first" />);
    rerender(<Parent label="second" />);
    expect(seen).toEqual(['first', 'second']);
  });
});
