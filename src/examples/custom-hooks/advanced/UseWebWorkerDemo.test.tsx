import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { handlePrimesRequest, type PrimesRequest } from './primes';
import UseWebWorkerDemo from './UseWebWorkerDemo';

/**
 * Stand-in for `new Worker(new URL('./primes.worker.ts', import.meta.url))`:
 * runs the same `handlePrimesRequest` and replies asynchronously, like a real
 * worker.
 */
class FakePrimesWorker extends EventTarget {
  static instances: FakePrimesWorker[] = [];
  constructor(public url: URL | string) {
    super();
    FakePrimesWorker.instances.push(this);
  }
  terminate = vi.fn();
  postMessage(request: PrimesRequest) {
    queueMicrotask(() =>
      handlePrimesRequest(request, (data) =>
        act(() => {
          this.dispatchEvent(new MessageEvent('message', { data }));
        }),
      ),
    );
  }
}

describe('UseWebWorkerDemo', () => {
  it('shows the unsupported notice and still allows the main-thread run', async () => {
    const user = userEvent.setup();
    render(<UseWebWorkerDemo />);
    expect(screen.getByText('Not supported in this browser')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Count in a worker' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Upper limit'), '500000');
    await user.click(screen.getByRole('button', { name: 'Count on the main thread (freezes UI)' }));
    expect(screen.getByText('41,538')).toBeInTheDocument();
    expect(screen.getByText(/main thread in/)).toBeInTheDocument();
  });

  it('counts primes in the worker created from primes.worker.ts and terminates it', async () => {
    FakePrimesWorker.instances = [];
    vi.stubGlobal('Worker', FakePrimesWorker);
    const user = userEvent.setup();
    const { unmount } = render(<UseWebWorkerDemo />);
    await user.selectOptions(screen.getByLabelText('Upper limit'), '500000');

    await user.click(screen.getByRole('button', { name: 'Count in a worker' }));
    const worker = FakePrimesWorker.instances[0];
    expect(String(worker?.url)).toMatch(/primes\.worker\.ts/);
    expect(await screen.findByText('41,538')).toBeInTheDocument();
    expect(screen.getByText(/worker thread in/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminate worker' }));
    expect(worker?.terminate).toHaveBeenCalled();
    unmount();
  });
});
