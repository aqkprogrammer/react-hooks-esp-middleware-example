import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseClickOutsideDemo from './UseClickOutsideDemo';

describe('UseClickOutsideDemo', () => {
  it('opens the popover, keeps it open for inside presses and closes on outside press', async () => {
    const user = userEvent.setup();
    render(<UseClickOutsideDemo />);
    const toggle = screen.getByRole('button', { name: /Filters/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByLabelText('On sale'));
    expect(screen.getByLabelText('On sale')).toBeChecked();
    expect(toggle).toHaveTextContent('Filters (1)');

    fireEvent.pointerDown(screen.getByText(/Why the capture phase/));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('On sale')).not.toBeInTheDocument();
    expect(screen.getByText(/Closed: pointerdown outside/)).toBeInTheDocument();
  });

  it('toggles with the (ignored) button and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<UseClickOutsideDemo />);
    const toggle = screen.getByRole('button', { name: /Filters/ });
    await user.click(toggle);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(screen.getByText(/Closed: Escape key/)).toBeInTheDocument();
  });
});
