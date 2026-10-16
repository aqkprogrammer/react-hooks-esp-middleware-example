import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseEffectStrictModeDemo from './UseEffectStrictModeDemo';

const messages = (name: string) =>
  within(screen.getByRole('log', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace(/^\S+ /, ''))
    .filter((text) => text !== 'Nothing logged yet.')
    .reverse();

describe('UseEffectStrictModeDemo (tests run a development build)', () => {
  it('runs setup → cleanup → setup inside StrictMode and a single setup outside', async () => {
    const user = userEvent.setup();
    render(<UseEffectStrictModeDemo />);
    expect(screen.getByText('development build')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unmount both rooms' }));
    expect(messages('Strict Mode log').at(-1)).toBe('❌ disconnect("general")');
    expect(messages('Normal log').at(-1)).toBe('❌ disconnect("general")');

    await user.click(screen.getByRole('button', { name: 'Clear logs' }));
    await user.click(screen.getByRole('button', { name: 'Mount both rooms' }));
    expect(messages('Strict Mode log')).toEqual([
      '✅ connect("general")',
      '❌ disconnect("general")',
      '✅ connect("general")',
    ]);
    expect(messages('Normal log')).toEqual(['✅ connect("general")']);
  });

  it('leaves exactly one live connection in each panel', async () => {
    const user = userEvent.setup();
    render(<UseEffectStrictModeDemo />);
    await user.click(screen.getByRole('button', { name: 'Unmount both rooms' }));
    await user.click(screen.getByRole('button', { name: 'Mount both rooms' }));
    await user.click(screen.getByRole('button', { name: 'Unmount both rooms' }));
    for (const name of ['Strict Mode log', 'Normal log']) {
      const log = messages(name);
      const connects = log.filter((text) => text?.startsWith('✅')).length;
      const disconnects = log.filter((text) => text?.startsWith('❌')).length;
      expect(connects).toBe(disconnects);
    }
  });
});
