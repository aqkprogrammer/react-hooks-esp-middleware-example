import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseEventListenerDemo from './UseEventListenerDemo';

describe('UseEventListenerDemo', () => {
  it('tracks key presses until the listener is detached', async () => {
    const user = userEvent.setup();
    render(<UseEventListenerDemo />);
    fireEvent.keyDown(window, { key: 'q' });
    expect(screen.getByText('q')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Detach keyboard listener' }));
    expect(screen.getByText('removed')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'z' });
    expect(screen.queryByText('z')).not.toBeInTheDocument();
  });

  it('updates the window size and logs pointer moves on the element', () => {
    render(<UseEventListenerDemo />);
    const restore = overrideProperty(window, 'innerWidth', 777);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByText(/^777 ×/)).toBeInTheDocument();
    restore();

    fireEvent.pointerMove(screen.getByLabelText('Pointer tracking area'));
    expect(screen.getByText(/pointermove at/)).toBeInTheDocument();
  });
});
