import { act, render, screen } from '@testing-library/react';
import { Component, Suspense, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createResourceCache, useResource } from './useResource';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children;
  }
}

describe('createResourceCache', () => {
  it('returns the same promise for a key and calls the loader once', () => {
    const cache = createResourceCache<number>();
    const load = vi.fn(() => Promise.resolve(1));
    expect(cache.read('a', load)).toBe(cache.read('a', load));
    expect(load).toHaveBeenCalledTimes(1);
    cache.invalidate('a');
    expect(cache.has('a')).toBe(false);
  });

  it('evicts the least recently read entry beyond maxEntries', () => {
    const cache = createResourceCache<number>({ maxEntries: 2 });
    const load = () => Promise.resolve(0);
    cache.read('a', load);
    cache.read('b', load);
    cache.read('a', load);
    cache.read('c', load);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });
});

describe('useResource', () => {
  it('suspends, then renders the resolved value', async () => {
    const cache = createResourceCache<string>();
    let resolve!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((res) => (resolve = res)));
    function Name() {
      return <p>{useResource(cache, 'user:1', load)}</p>;
    }
    await act(async () => {
      render(
        <Suspense fallback={<p>loading…</p>}>
          <Name />
        </Suspense>,
      );
    });
    expect(screen.getByText('loading…')).toBeInTheDocument();
    await act(async () => resolve('Ada'));
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('throws rejections to the error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cache = createResourceCache<string>();
    function Broken() {
      return <p>{useResource(cache, 'x', () => Promise.reject(new Error('Not found')))}</p>;
    }
    await act(async () => {
      render(
        <Boundary>
          <Suspense fallback={<p>loading…</p>}>
            <Broken />
          </Suspense>
        </Boundary>,
      );
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Not found');
  });
});
