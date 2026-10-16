import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import UseDocumentTitleDemo from './UseDocumentTitleDemo';

afterEach(() => {
  document.title = '';
});

describe('UseDocumentTitleDemo', () => {
  it('sets the title while typing and restores it on unmount', async () => {
    const user = userEvent.setup();
    document.title = 'Playground';
    render(<UseDocumentTitleDemo />);
    expect(document.title).toBe('Inbox (3)');

    const input = screen.getByLabelText('Document title');
    await user.clear(input);
    await user.type(input, 'Drafts');
    expect(document.title).toBe('Drafts');

    await user.click(screen.getByRole('button', { name: 'Unmount title owner' }));
    expect(document.title).toBe('Playground');
    await user.click(screen.getByRole('button', { name: 'Log document.title' }));
    expect(screen.getByText(/document.title = “Playground”/)).toBeInTheDocument();
  });

  it('keeps the title when restore is turned off', async () => {
    const user = userEvent.setup();
    document.title = 'Playground';
    render(<UseDocumentTitleDemo />);
    await user.click(screen.getByRole('button', { name: 'Unmount title owner' }));
    await user.click(screen.getByLabelText(/Restore the previous title/));
    await user.click(screen.getByRole('button', { name: 'Mount title owner' }));
    await user.click(screen.getByRole('button', { name: 'Unmount title owner' }));
    expect(document.title).toBe('Inbox (3)');
  });
});
