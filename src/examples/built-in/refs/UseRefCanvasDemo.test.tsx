import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UseRefCanvasDemo from './UseRefCanvasDemo';

/** jsdom has no canvas implementation: install a recording 2D context. */
function installFakeContext() {
  const context = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  return context;
}

describe('UseRefCanvasDemo', () => {
  it('draws a stroke from pointer events through the canvas ref', () => {
    const context = installFakeContext();
    render(<UseRefCanvasDemo />);
    const canvas = screen.getByRole('img', { name: 'Drawing canvas with 0 strokes' });

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 25, clientY: 35, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(context.moveTo).toHaveBeenCalledWith(10, 10);
    expect(context.lineTo).toHaveBeenCalledWith(20, 30);
    expect(context.lineTo).toHaveBeenLastCalledWith(25, 35);
    expect(context.stroke).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('img', { name: 'Drawing canvas with 1 stroke' })).toBeInTheDocument();

    // Moving without a pressed pointer draws nothing.
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
    expect(context.stroke).toHaveBeenCalledTimes(2);
  });

  it('uses the brush size and supports keyboard-driven drawing and clearing', async () => {
    const user = userEvent.setup();
    const context = installFakeContext();
    render(<UseRefCanvasDemo />);

    fireEvent.change(screen.getByLabelText('Brush size: 4px'), { target: { value: '9' } });
    await user.click(screen.getByRole('button', { name: 'Draw a spiral' }));
    expect(context.lineWidth).toBe(9);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 stroke')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 640, 260);
    expect(screen.getByText('0 strokes')).toBeInTheDocument();
  });

  it('explains when the 2D context is unavailable', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<UseRefCanvasDemo />);
    await user.click(screen.getByRole('button', { name: 'Draw a spiral' }));
    expect(screen.getByText('Canvas 2D is not available')).toBeInTheDocument();
    expect(screen.getByText('0 strokes')).toBeInTheDocument();
  });
});
