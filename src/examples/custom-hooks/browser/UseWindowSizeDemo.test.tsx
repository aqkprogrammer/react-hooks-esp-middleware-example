import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseWindowSizeDemo from './UseWindowSizeDemo';

describe('UseWindowSizeDemo', () => {
  it('shows the window size in both readers and updates on resize', () => {
    render(<UseWindowSizeDemo />);
    expect(screen.getAllByText(`${window.innerWidth}px`)).toHaveLength(2);
    const restore = overrideProperty(window, 'innerWidth', 640);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    // The unthrottled reader and the throttled reader's leading edge both update.
    expect(screen.getAllByText('640px')).toHaveLength(2);
    restore();
  });

  it('changes the throttle interval with the slider', () => {
    render(<UseWindowSizeDemo />);
    fireEvent.change(screen.getByLabelText(/Throttle interval/), { target: { value: '500' } });
    expect(screen.getByText('Throttled (500 ms)')).toBeInTheDocument();
  });
});
