import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseRefVsStateDemo from './UseRefVsStateDemo';

const commits = (label: string) => {
  const text = screen.getByText(new RegExp(`^${label} commits:`)).textContent ?? '';
  return Number(/commits: (\d+)/.exec(text)?.[1]);
};

describe('UseRefVsStateDemo', () => {
  it('re-renders for state updates but not for ref mutations', async () => {
    const user = userEvent.setup();
    render(<UseRefVsStateDemo />);

    for (let index = 0; index < 3; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Increment state' }));
      await user.click(screen.getByRole('button', { name: 'Increment ref' }));
    }

    expect(screen.getByLabelText('State count')).toHaveTextContent('Clicked 3 times');
    expect(commits('State counter')).toBe(4);
    expect(commits('Ref counter')).toBe(1);
  });

  it('the ref still holds the latest value when read from an event handler', async () => {
    const user = userEvent.setup();
    render(<UseRefVsStateDemo />);
    await user.click(screen.getByRole('button', { name: 'Increment ref' }));
    await user.click(screen.getByRole('button', { name: 'Increment ref' }));
    await user.click(screen.getByRole('button', { name: 'Read the ref' }));
    expect(
      within(screen.getByRole('log', { name: 'Ref reads' })).getByText(/countRef.current is 2/),
    ).toBeInTheDocument();
    expect(commits('Ref counter')).toBe(1);
  });
});
