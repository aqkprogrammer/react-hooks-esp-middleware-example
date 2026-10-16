import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UseAnimationFrameDemo from './UseAnimationFrameDemo';

function installManualRaf() {
  let nextId = 1;
  const queue = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.set(nextId, callback);
    return nextId++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    get pending() {
      return queue.size;
    },
    frames(count: number, start: number, step = 16) {
      for (let i = 0; i < count; i += 1) {
        const callbacks = [...queue.values()];
        queue.clear();
        act(() => callbacks.forEach((callback) => callback(start + i * step)));
      }
    },
  };
}

describe('UseAnimationFrameDemo', () => {
  it('animates, reports FPS and pauses', () => {
    const raf = installManualRaf();
    render(<UseAnimationFrameDemo />);
    raf.frames(40, 0); // 40 frames at 16 ms ≈ 62.5 fps
    const stats = screen.getByLabelText('Animation stats');
    expect(stats).toHaveTextContent(/FPS6\d/);
    expect(stats).toHaveTextContent('Staterunning');

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(raf.pending).toBe(0);
    expect(stats).toHaveTextContent('Statepaused');
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(raf.pending).toBe(1);
  });
});
