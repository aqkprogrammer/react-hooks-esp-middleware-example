import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import UseFormDirtyStateDemo from './UseFormDirtyStateDemo';

describe('UseFormDirtyStateDemo', () => {
  it('tracks changes, returns to clean on undo, and saves a new baseline', async () => {
    const user = userEvent.setup();
    render(<UseFormDirtyStateDemo />);
    expect(screen.getByText('All changes saved')).toBeInTheDocument();

    const name = screen.getByLabelText('Display name');
    await user.type(name, 'x');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByText('Display name changed')).toBeInTheDocument();
    await user.type(name, '{Backspace}');
    expect(screen.getByText('All changes saved')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Subscribe to the newsletter'));
    expect(screen.getByText('Newsletter changed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('All changes saved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });

  it('discards changes and guards unload only while dirty', async () => {
    const user = userEvent.setup();
    render(<UseFormDirtyStateDemo />);
    await user.type(screen.getByLabelText('Bio'), '!');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText('Bio')).toHaveValue('Mathematician');
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
  });
});
