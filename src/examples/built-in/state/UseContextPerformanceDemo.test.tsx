import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseContextPerformanceDemo from './UseContextPerformanceDemo';

const commits = (label: string) => {
  const text = screen.getByText(new RegExp(`^${label} commits:`)).textContent ?? '';
  return Number(/commits: (\d+)/.exec(text)?.[1]);
};

describe('UseContextPerformanceDemo', () => {
  it('increments the count in every implementation', async () => {
    const user = userEvent.setup();
    render(<UseContextPerformanceDemo />);
    for (const name of ['naive', 'split', 'memoised']) {
      await user.click(screen.getByRole('button', { name: `Increment (${name})` }));
    }
    const panel = (title: string) => within(screen.getByRole('region', { name: title }));
    expect(panel('Naive: inline object value').getByText('Count: 1')).toBeInTheDocument();
    expect(panel('Split state / dispatch contexts').getByText('Count: 1')).toBeInTheDocument();
    expect(panel('Memoised object value').getByText('Count: 1')).toBeInTheDocument();
  });

  it('only the split version keeps the button from re-rendering on increments', async () => {
    const user = userEvent.setup();
    render(<UseContextPerformanceDemo />);
    for (const name of ['naive', 'split', 'memoised']) {
      await user.click(screen.getByRole('button', { name: `Increment (${name})` }));
    }
    expect(commits('Naive display')).toBe(2);
    expect(commits('Naive button')).toBe(2);
    expect(commits('Split display')).toBe(2);
    expect(commits('Split button')).toBe(1);
    expect(commits('Memoised display')).toBe(2);
    expect(commits('Memoised button')).toBe(2);
  });

  it('unrelated provider updates re-render consumers only with an unstable value', async () => {
    const user = userEvent.setup();
    render(<UseContextPerformanceDemo />);
    for (const name of ['naive', 'optimised', 'memoised']) {
      await user.click(screen.getByRole('button', { name: `Unrelated ${name} update` }));
    }
    expect(commits('Naive display')).toBe(2);
    expect(commits('Naive button')).toBe(2);
    expect(commits('Split display')).toBe(1);
    expect(commits('Split button')).toBe(1);
    expect(commits('Memoised display')).toBe(1);
    expect(commits('Memoised button')).toBe(1);
  });
});
