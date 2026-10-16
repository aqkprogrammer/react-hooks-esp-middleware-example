import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebWorker } from './useWebWorker';

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = [];
  readonly posted: unknown[] = [];
  terminated = false;
  constructor(
    public url?: string | URL,
    public options?: WorkerOptions,
  ) {
    super();
    FakeWorker.instances.push(this);
  }
  postMessage = vi.fn((message: unknown) => {
    this.posted.push(message);
  });
  terminate = vi.fn(() => {
    this.terminated = true;
  });
  /** Simulate `self.postMessage(data)` inside the worker. */
  reply(data: unknown) {
    act(() => {
      this.dispatchEvent(new MessageEvent('message', { data }));
    });
  }
  fail(message: string) {
    act(() => {
      this.dispatchEvent(new ErrorEvent('error', { message, cancelable: true }));
    });
  }
}

const latest = () => {
  const worker = FakeWorker.instances.at(-1);
  if (!worker) throw new Error('no worker');
  return worker;
};

beforeEach(() => {
  FakeWorker.instances = [];
});

describe('useWebWorker', () => {
  it('is unsupported without Worker and postMessage returns false', () => {
    const { result } = renderHook(() => useWebWorker<number, number>('/worker.js'));
    expect(result.current.isSupported).toBe(false);
    let posted = true;
    act(() => {
      posted = result.current.postMessage(1);
    });
    expect(posted).toBe(false);
  });

  it('spawns lazily, posts typed messages and receives replies', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const onMessage = vi.fn();
    const { result } = renderHook(() =>
      useWebWorker<{ limit: number }, { count: number }>('/primes.js', {
        workerOptions: { type: 'module' },
        onMessage,
      }),
    );
    expect(FakeWorker.instances).toHaveLength(0);
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.postMessage({ limit: 100 });
    });
    const worker = latest();
    expect(worker.url).toBe('/primes.js');
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.posted).toEqual([{ limit: 100 }]);
    expect(result.current.isRunning).toBe(true);

    worker.reply({ count: 25 });
    expect(result.current.lastMessage).toEqual({ count: 25 });
    expect(onMessage).toHaveBeenCalledWith({ count: 25 });

    act(() => {
      result.current.postMessage({ limit: 10 });
    });
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it('uses a factory (the Vite pattern) and ignores its changing identity', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const factory = vi.fn(() => new FakeWorker('factory') as unknown as Worker);
    const { result, rerender } = renderHook(() => useWebWorker<string, string>(() => factory()));
    act(() => {
      result.current.postMessage('a');
    });
    rerender();
    act(() => {
      result.current.postMessage('b');
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(latest().terminated).toBe(false);
  });

  it('captures worker errors', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const onError = vi.fn();
    const { result } = renderHook(() => useWebWorker<number, number>('/w.js', { onError }));
    act(() => {
      result.current.postMessage(1);
    });
    latest().fail('Uncaught RangeError');
    expect(result.current.error?.message).toBe('Uncaught RangeError');
    expect(onError).toHaveBeenCalled();
  });

  it('reports a factory that throws', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const { result } = renderHook(() =>
      useWebWorker<number, number>(() => {
        throw new DOMException('Failed to construct Worker', 'SecurityError');
      }),
    );
    let posted = true;
    act(() => {
      posted = result.current.postMessage(1);
    });
    expect(posted).toBe(false);
    expect(result.current.error?.message).toBe('Failed to construct Worker');
  });

  it('terminate() stops the worker, ignores late messages and respawns on demand', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const { result } = renderHook(() => useWebWorker<number, number>('/w.js'));
    act(() => {
      result.current.postMessage(1);
    });
    const first = latest();
    act(() => result.current.terminate());
    expect(first.terminate).toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);

    first.reply(42);
    expect(result.current.lastMessage).toBeUndefined();

    act(() => {
      result.current.postMessage(2);
    });
    expect(FakeWorker.instances).toHaveLength(2);
    expect(result.current.isRunning).toBe(true);
  });

  it('terminates on unmount and when the source URL changes', () => {
    vi.stubGlobal('Worker', FakeWorker);
    const { result, rerender, unmount } = renderHook(
      ({ url }) => useWebWorker<number, number>(url),
      { initialProps: { url: '/a.js' } },
    );
    act(() => {
      result.current.postMessage(1);
    });
    const a = latest();
    rerender({ url: '/b.js' });
    expect(a.terminate).toHaveBeenCalled();
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.postMessage(1);
    });
    const b = latest();
    expect(b.url).toBe('/b.js');
    unmount();
    expect(b.terminate).toHaveBeenCalled();
  });
});
