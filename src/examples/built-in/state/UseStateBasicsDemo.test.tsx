import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseStateBasicsDemo from './UseStateBasicsDemo';

describe('UseStateBasicsDemo', () => {
  it('updates primitive and object state', async () => {
    const user = userEvent.setup();
    render(<UseStateBasicsDemo />);
    await user.click(screen.getByRole('button', { name: 'Like' }));
    expect(screen.getByText('Likes: 1')).toBeInTheDocument();

    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Grace');
    expect(screen.getByText('{"name":"Grace","age":36}')).toBeInTheDocument();
  });

  it('adds 1 with stale values but 3 with updater functions', async () => {
    const user = userEvent.setup();
    render(<UseStateBasicsDemo />);
    const count = screen.getByLabelText('Count');
    await user.click(screen.getByRole('button', { name: 'setCount(count + 1) ×3' }));
    expect(count).toHaveTextContent('count = 1');
    await user.click(screen.getByRole('button', { name: 'setCount(c => c + 1) ×3' }));
    expect(count).toHaveTextContent('count = 4');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(count).toHaveTextContent('count = 0');
  });

  it('lazily initialises from the saved draft when remounted', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('playground:use-state-draft', 'saved text');
    render(<UseStateBasicsDemo />);
    const draft = screen.getByLabelText('Draft');
    expect(draft).toHaveValue('saved text');

    await user.clear(draft);
    await user.type(draft, 'new');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Saved "new"')).toBeInTheDocument();
    await user.type(draft, ' unsaved');

    await user.click(screen.getByRole('button', { name: 'Remount the editor' }));
    expect(screen.getByLabelText('Draft')).toHaveValue('new');
  });
});
