import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseEffectLifecycleDemo from './UseEffectLifecycleDemo';

/** Log entries in chronological order (the EventLog shows newest first). */
const messages = () =>
  within(screen.getByRole('log', { name: 'Lifecycle' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent?.replace(/^\S+ /, '') ?? '')
    .filter((text) => text !== 'Nothing logged yet.')
    .reverse();

describe('UseEffectLifecycleDemo', () => {
  it('runs every effect on mount in declaration order', () => {
    render(<UseEffectLifecycleDemo />);
    expect(messages()).toEqual([
      '[no deps] effect ran',
      '[ [] ] mounted',
      '[roomId] connect to "general"',
    ]);
  });

  it('re-runs only the no-deps effect on an unrelated re-render', async () => {
    const user = userEvent.setup();
    render(<UseEffectLifecycleDemo />);
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    await user.click(screen.getByRole('button', { name: 'Re-render the child' }));
    expect(messages()).toEqual(['[no deps] cleanup', '[no deps] effect ran']);
  });

  it('cleans up with the old value before re-running when a dependency changes', async () => {
    const user = userEvent.setup();
    render(<UseEffectLifecycleDemo />);
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    await user.click(screen.getByRole('button', { name: 'music' }));
    expect(messages()).toEqual([
      '[no deps] cleanup',
      '[roomId] disconnect from "general"',
      '[no deps] effect ran',
      '[roomId] connect to "music"',
    ]);
  });

  it('runs every cleanup on unmount', async () => {
    const user = userEvent.setup();
    render(<UseEffectLifecycleDemo />);
    await user.click(screen.getByRole('button', { name: 'Clear log' }));
    await user.click(screen.getByRole('button', { name: 'Unmount child' }));
    expect(messages()).toEqual([
      '[no deps] cleanup',
      '[ [] ] unmounted',
      '[roomId] disconnect from "general"',
    ]);
    expect(screen.getByText('Child unmounted.')).toBeInTheDocument();
  });
});
