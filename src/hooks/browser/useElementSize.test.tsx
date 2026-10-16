import { act, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { installResizeObserver } from '../../test/browserMocks';
import { useElementSize, type UseElementSizeOptions } from './useElementSize';

function Measured(props: UseElementSizeOptions) {
  const { ref, width, height, isSupported } = useElementSize<HTMLDivElement>(props);
  return (
    <div ref={ref} data-testid="measured">
      {`${width}x${height}|${String(isSupported)}`}
    </div>
  );
}

function entryFor(target: Element, content: number, border: number) {
  return {
    target,
    contentRect: { width: content, height: content },
    contentBoxSize: [{ inlineSize: content, blockSize: content }],
    borderBoxSize: [{ inlineSize: border, blockSize: border }],
  } as unknown as ResizeObserverEntry;
}

describe('useElementSize', () => {
  it('reports the content box by default and skips identical sizes', () => {
    const Observer = installResizeObserver();
    const onCommit = vi.fn();
    render(
      <Profiler id="measured" onRender={onCommit}>
        <Measured />
      </Profiler>,
    );
    const element = screen.getByTestId('measured');
    expect(element).toHaveTextContent('0x0|true');

    Observer.resizeAll(element, 200, 100);
    expect(element).toHaveTextContent('200x100');
    const commits = onCommit.mock.calls.length;
    Observer.resizeAll(element, 200, 100);
    expect(onCommit).toHaveBeenCalledTimes(commits);
  });

  it('reads the border box when asked', () => {
    const Observer = installResizeObserver();
    render(<Measured box="border-box" />);
    const element = screen.getByTestId('measured');
    const observer = Observer.instances.at(-1);
    // Call the observer's callback with distinct content/border sizes.
    const callback = (observer as unknown as { callback: ResizeObserverCallback }).callback;
    act(() => callback([entryFor(element, 100, 120)], observer as unknown as ResizeObserver));
    expect(element).toHaveTextContent('120x120');
  });

  it('falls back to contentRect without box size arrays (older Safari)', () => {
    const Observer = installResizeObserver();
    render(<Measured />);
    const element = screen.getByTestId('measured');
    const observer = Observer.instances.at(-1);
    const callback = (observer as unknown as { callback: ResizeObserverCallback }).callback;
    const legacy = { target: element, contentRect: { width: 33, height: 44 } };
    act(() =>
      callback([legacy as unknown as ResizeObserverEntry], observer as unknown as ResizeObserver),
    );
    expect(element).toHaveTextContent('33x44');
  });

  it('uses initialSize when ResizeObserver is unsupported', () => {
    render(<Measured initialSize={{ width: 320, height: 240 }} />);
    expect(screen.getByTestId('measured')).toHaveTextContent('320x240|false');
  });
});
