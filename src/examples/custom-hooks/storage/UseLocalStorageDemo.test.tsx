import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseLocalStorageDemo from './UseLocalStorageDemo';

describe('UseLocalStorageDemo', () => {
  it('syncs the editor and the preview and persists the note', async () => {
    const user = userEvent.setup();
    render(<UseLocalStorageDemo />);
    await user.type(screen.getByLabelText('Note'), 'hi');
    expect(screen.getByText('"hi"')).toBeInTheDocument();
    expect(window.localStorage.getItem('playground:note')).toBe('"hi"');
  });

  it('surfaces corrupt data instead of crashing', async () => {
    const user = userEvent.setup();
    render(<UseLocalStorageDemo />);
    await user.click(screen.getByRole('button', { name: 'Write invalid JSON' }));
    expect(await screen.findByText('Storage error: parse')).toBeInTheDocument();
    expect(screen.getByLabelText('Note')).toHaveValue('');
  });
});
