import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseSetMapDemo from './UseSetMapDemo';

describe('UseSetMapDemo', () => {
  it('toggles tags in a Set', async () => {
    const user = userEvent.setup();
    render(<UseSetMapDemo />);
    const hooks = screen.getByRole('button', { name: 'hooks' });
    await user.click(hooks);
    expect(hooks).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Selected tags')).toHaveTextContent('["react","hooks"]');
    await user.click(screen.getByRole('button', { name: 'react' }));
    expect(screen.getByLabelText('Selected tags')).toHaveTextContent('["hooks"]');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Selected tags')).toHaveTextContent('size0');
  });

  it('keeps quantities in a Map', async () => {
    const user = userEvent.setup();
    render(<UseSetMapDemo />);
    await user.click(screen.getByRole('button', { name: 'Add one Mouse' }));
    await user.click(screen.getByRole('button', { name: 'Add one Mouse' }));
    await user.click(screen.getByRole('button', { name: 'Add one Keyboard' }));
    expect(screen.getByLabelText('Cart')).toHaveTextContent('total items3');
    await user.click(screen.getByRole('button', { name: 'Remove Mouse from cart' }));
    expect(screen.getByLabelText('Cart')).toHaveTextContent('[["kb",1]]');
    await user.click(screen.getByRole('button', { name: 'Empty cart' }));
    expect(screen.getByLabelText('Cart')).toHaveTextContent('total items0');
  });
});
