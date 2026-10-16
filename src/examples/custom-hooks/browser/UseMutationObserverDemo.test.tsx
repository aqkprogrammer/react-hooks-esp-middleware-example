import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseMutationObserverDemo from './UseMutationObserverDemo';

describe('UseMutationObserverDemo', () => {
  it('logs DOM changes made outside React', async () => {
    const user = userEvent.setup();
    render(<UseMutationObserverDemo />);
    await user.click(screen.getByRole('button', { name: 'Append item' }));
    expect(screen.getByRole('list', { name: 'Widget items' })).toHaveTextContent('Item 1');
    expect(await screen.findByText(/childList: \+1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle data-state' }));
    expect(await screen.findByText(/attributes: data-state idle → busy/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('characterData'));
    await user.click(screen.getByRole('button', { name: /Edit first item/ }));
    expect(await screen.findByText(/characterData: “Item 1” → “Item 1 ✎”/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove last item' }));
    expect(await screen.findByText(/childList: \+0 \/ −1/)).toBeInTheDocument();
  });

  it('stops observing when every option is off', async () => {
    const user = userEvent.setup();
    render(<UseMutationObserverDemo />);
    await user.click(screen.getByLabelText('childList'));
    await user.click(screen.getByLabelText('attributes'));
    expect(screen.getByText(/nothing is observed right now/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Append item' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText(/childList:/)).not.toBeInTheDocument();
  });
});
