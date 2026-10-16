import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseRefImperativeWidgetDemo from './UseRefImperativeWidgetDemo';

const pressedStars = () =>
  within(screen.getByRole('group', { name: 'Rating widget' }))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true').length;

const reactRating = () =>
  within(screen.getByLabelText('React state')).getAllByRole('definition')[0]?.textContent;

describe('UseRefImperativeWidgetDemo', () => {
  it('pushes React state into the widget', async () => {
    const user = userEvent.setup();
    render(<UseRefImperativeWidgetDemo />);
    expect(pressedStars()).toBe(3);
    await user.click(screen.getByRole('button', { name: '+ 1 from React' }));
    expect(pressedStars()).toBe(4);
    await user.click(screen.getByRole('button', { name: '− 1 from React' }));
    await user.click(screen.getByRole('button', { name: '− 1 from React' }));
    expect(pressedStars()).toBe(2);
  });

  it('reports widget clicks back to React through the latest callback', async () => {
    const user = userEvent.setup();
    render(<UseRefImperativeWidgetDemo />);
    await user.click(screen.getByRole('button', { name: '5 stars' }));
    expect(reactRating()).toBe('5');
    expect(pressedStars()).toBe(5);
  });

  it('recreates the widget when a creation-time option changes and keeps the value', async () => {
    const user = userEvent.setup();
    render(<UseRefImperativeWidgetDemo />);
    await user.click(screen.getByRole('button', { name: 'Switch to 10 stars' }));
    const group = within(screen.getByRole('group', { name: 'Rating widget' }));
    expect(group.getAllByRole('button')).toHaveLength(10);
    expect(pressedStars()).toBe(3);
    expect(screen.getAllByRole('group', { name: 'Rating widget' })).toHaveLength(1);

    const log = within(screen.getByRole('log', { name: 'Widget lifecycle' }));
    expect(log.getByText(/widget.destroy\(\)/)).toBeInTheDocument();
    expect(log.getByText(/createStarRating\(\{ max: 10 \}\)/)).toBeInTheDocument();
  });

  it('destroys the widget DOM on unmount', async () => {
    const user = userEvent.setup();
    render(<UseRefImperativeWidgetDemo />);
    await user.click(screen.getByRole('button', { name: 'Unmount widget' }));
    expect(screen.queryByRole('group', { name: 'Rating widget' })).not.toBeInTheDocument();
    expect(screen.getByText('Widget destroyed.')).toBeInTheDocument();
  });
});
