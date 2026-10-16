import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installResizeObserver } from '../../../test/browserMocks';
import UseResizeObserverDemo from './UseResizeObserverDemo';

describe('UseResizeObserverDemo', () => {
  it('switches layout when the measured box crosses 360px', () => {
    const Observer = installResizeObserver();
    render(<UseResizeObserverDemo />);
    const box = screen.getByText('Column A').closest('.use-resize-observer-demo-box');
    if (!box) throw new Error('box not found');
    Observer.resizeAll(box, 300, 100);
    expect(screen.getByText('300 × 100 px')).toBeInTheDocument();
    expect(screen.getByText('stacked')).toBeInTheDocument();
    Observer.resizeAll(box, 400, 100);
    expect(screen.getByText('two columns')).toBeInTheDocument();
  });

  it('logs textarea resize entries and can stop observing', async () => {
    const user = userEvent.setup();
    const Observer = installResizeObserver();
    render(<UseResizeObserverDemo />);
    const textarea = screen.getByLabelText('Notes');
    Observer.resizeAll(textarea, 250, 90);
    expect(screen.getByText(/border-box 250 × 90/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Observing'));
    expect(Observer.instances.filter((o) => o.elements.has(textarea))).toHaveLength(0);
  });

  it('switches the measured box with the radio buttons', async () => {
    const user = userEvent.setup();
    installResizeObserver();
    render(<UseResizeObserverDemo />);
    await user.click(screen.getByLabelText('border-box'));
    expect(screen.getByText('border-box size')).toBeInTheDocument();
  });

  it('warns when ResizeObserver is unsupported', () => {
    render(<UseResizeObserverDemo />);
    expect(
      screen.getByText('ResizeObserver is not available in this browser.'),
    ).toBeInTheDocument();
  });
});
