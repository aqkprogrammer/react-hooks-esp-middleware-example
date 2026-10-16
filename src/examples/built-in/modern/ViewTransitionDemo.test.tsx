import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ViewTransitionDemo from './ViewTransitionDemo';

const slide = () => screen.getByRole('article', { name: 'Current slide' });

describe('ViewTransitionDemo', () => {
  it('still updates without the View Transition API (jsdom has none)', async () => {
    const user = userEvent.setup();
    render(<ViewTransitionDemo />);
    expect(screen.getByText(/No View Transition API here/)).toBeInTheDocument();
    expect(slide()).toHaveTextContent('Hooks');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(slide()).toHaveTextContent('Concurrent rendering');
    expect(slide()).toHaveTextContent('Slide 2 of 5');
  });

  it('wraps around in both directions, with and without a transition', async () => {
    const user = userEvent.setup();
    render(<ViewTransitionDemo />);
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(slide()).toHaveTextContent('View Transitions');
    await user.click(screen.getByLabelText(/Update inside startTransition/));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(slide()).toHaveTextContent('Hooks');
  });
});
