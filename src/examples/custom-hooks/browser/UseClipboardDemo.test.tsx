import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseClipboardDemo from './UseClipboardDemo';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

function installClipboard() {
  const clipboard = {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('from clipboard')),
  };
  restores.push(overrideProperty(window, 'isSecureContext', true));
  restores.push(overrideProperty(navigator, 'clipboard', clipboard));
  return clipboard;
}

describe('UseClipboardDemo', () => {
  it('copies the snippet and announces it', async () => {
    const user = userEvent.setup();
    const clipboard = installClipboard();
    render(<UseClipboardDemo />);
    await user.click(screen.getByRole('button', { name: 'Copy command' }));
    expect(clipboard.writeText).toHaveBeenCalledWith(
      'npm create vite@latest my-app -- --template react-ts',
    );
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard.');
  });

  it('pastes text and shows read errors', async () => {
    const user = userEvent.setup();
    const clipboard = installClipboard();
    render(<UseClipboardDemo />);
    await user.click(screen.getByRole('button', { name: 'Paste from clipboard' }));
    expect(screen.getByLabelText('Pasted text')).toHaveValue('from clipboard');

    clipboard.readText.mockRejectedValueOnce(
      Object.assign(new Error('Read permission denied.'), { name: 'NotAllowedError' }),
    );
    await user.click(screen.getByRole('button', { name: 'Paste from clipboard' }));
    expect(screen.getByText('NotAllowedError: Read permission denied.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset status' }));
    expect(screen.queryByText('Clipboard error')).not.toBeInTheDocument();
  });

  it('explains the secure-context requirement when unsupported', () => {
    render(<UseClipboardDemo />);
    expect(screen.getByText('Secure context required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy command' })).toBeDisabled();
  });
});
