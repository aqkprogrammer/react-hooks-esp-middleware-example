import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStableCallbackDemo from './UseStableCallbackDemo';

describe('UseStableCallbackDemo', () => {
  it('logs the latest message from every variant', async () => {
    const user = userEvent.setup();
    render(<UseStableCallbackDemo />);
    await user.type(screen.getByLabelText('Message'), 'hi');
    await user.click(screen.getByRole('button', { name: 'Send (stable)' }));
    await user.click(screen.getByRole('button', { name: 'Send (useCallback)' }));
    await user.click(screen.getByRole('button', { name: 'Send (inline)' }));
    const log = screen.getByRole('log');
    expect(log).toHaveTextContent('useStableCallback: "hi"');
    expect(log).toHaveTextContent('useCallback: "hi"');
    expect(log).toHaveTextContent('inline: "hi"');
  });

  it('lets the memoized child skip re-renders only with the stable callback', async () => {
    const user = userEvent.setup();
    render(<UseStableCallbackDemo />);
    await user.type(screen.getByLabelText('Message'), 'abc');
    const stable = screen.getByText(/useStableCallback commits:/);
    const inline = screen.getByText(/Inline arrow commits:/);
    expect(stable).toHaveTextContent(/commits: 1 /);
    expect(inline).toHaveTextContent(/commits: 4 /);
  });
});
