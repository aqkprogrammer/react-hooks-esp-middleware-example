import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { installIntersectionObserver } from '../../test/browserMocks';
import { useInfiniteScroll, type UseInfiniteScrollOptions } from './useInfiniteScroll';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Feed(props: Omit<UseInfiniteScrollOptions, 'hasMore'> & { hasMore?: boolean }) {
  const { sentinelRef, isLoading, isSupported } = useInfiniteScroll({
    hasMore: true,
    ...props,
  });
  return (
    <div>
      <p>{isSupported ? 'supported' : 'unsupported'}</p>
      <p>{isLoading ? 'loading' : 'idle'}</p>
      <div data-testid="sentinel" ref={sentinelRef} />
    </div>
  );
}

describe('useInfiniteScroll', () => {
  it('loads when the sentinel intersects and never twice while loading', async () => {
    const IO = installIntersectionObserver();
    const load = deferred();
    const loadMore = vi.fn(() => load.promise);
    render(<Feed loadMore={loadMore} />);
    const sentinel = screen.getByTestId('sentinel');

    IO.triggerAll(sentinel, true);
    IO.triggerAll(sentinel, true);
    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByText('loading')).toBeInTheDocument();

    await act(async () => load.resolve());
    expect(screen.getByText('idle')).toBeInTheDocument();
    // A fresh observer is created after loading so the next intersection loads again.
    IO.triggerAll(sentinel, true);
    expect(loadMore).toHaveBeenCalledTimes(2);
  });

  it('ignores non-intersecting entries', () => {
    const IO = installIntersectionObserver();
    const loadMore = vi.fn(() => Promise.resolve());
    render(<Feed loadMore={loadMore} />);
    IO.triggerAll(screen.getByTestId('sentinel'), false);
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('does not observe when hasMore is false or isLoading is true', () => {
    const IO = installIntersectionObserver();
    const loadMore = vi.fn();
    const { rerender } = render(<Feed loadMore={loadMore} hasMore={false} />);
    expect(IO.instances).toHaveLength(0);
    rerender(<Feed loadMore={loadMore} isLoading />);
    expect(IO.instances).toHaveLength(0);
    rerender(<Feed loadMore={loadMore} />);
    IO.triggerAll(screen.getByTestId('sentinel'), true);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount and does not update state after it', async () => {
    const IO = installIntersectionObserver();
    const load = deferred();
    const errorSpy = vi.spyOn(console, 'error');
    const { unmount } = render(<Feed loadMore={() => load.promise} />);
    IO.triggerAll(screen.getByTestId('sentinel'), true);
    unmount();
    expect(IO.instances.every((observer) => observer.disconnected)).toBe(true);
    await act(async () => load.resolve());
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('reports isSupported=false without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Feed loadMore={vi.fn()} />);
    expect(screen.getByText('unsupported')).toBeInTheDocument();
  });

  it('works with a sentinel that appears later', () => {
    const IO = installIntersectionObserver();
    const loadMore = vi.fn(() => Promise.resolve());
    function Later() {
      const [show, setShow] = useState(false);
      const { sentinelRef } = useInfiniteScroll({ loadMore, hasMore: true });
      return (
        <>
          <button type="button" onClick={() => setShow(true)}>
            show
          </button>
          {show ? <div data-testid="late" ref={sentinelRef} /> : null}
        </>
      );
    }
    render(<Later />);
    expect(IO.instances).toHaveLength(0);
    act(() => screen.getByRole('button').click());
    IO.triggerAll(screen.getByTestId('late'), true);
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
