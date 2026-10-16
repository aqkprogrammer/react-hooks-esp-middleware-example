import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import ClipboardScenario from './ClipboardScenario';

const restores: Array<() => void> = [];
afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.useRealTimers();
});

/** Call after `userEvent.setup()`, which installs its own clipboard stub. */
function installClipboard({ secure = true, read = true } = {}) {
  const clipboard: { writeText: ReturnType<typeof vi.fn>; readText?: ReturnType<typeof vi.fn> } = {
    writeText: vi.fn((_text: string) => Promise.resolve()),
  };
  if (read) clipboard.readText = vi.fn(() => Promise.resolve('from clipboard'));
  restores.push(overrideProperty(window, 'isSecureContext', secure));
  restores.push(overrideProperty(navigator, 'clipboard', clipboard));
  return clipboard;
}

const region = (politeness: 'polite' | 'assertive') =>
  document.querySelector(`[data-live-announcer="${politeness}"]`);

describe('ClipboardScenario', () => {
  it('copies a snippet, shows "Copied!" and announces it, then resets', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const clipboard = installClipboard();
    render(<ClipboardScenario />);
    await user.click(screen.getByRole('button', { name: 'Copy Install command' }));
    expect(clipboard.writeText).toHaveBeenCalledWith('npm install @tanstack/react-query');
    expect(screen.getByRole('button', { name: 'Install command copied' })).toHaveTextContent(
      'Copied!',
    );
    act(() => vi.advanceTimersByTime(150));
    expect(region('polite')).toHaveTextContent('Install command copied to the clipboard.');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy Install command' })).toHaveTextContent('Copy');
  });

  it('reports a blocked write and announces it assertively', async () => {
    const user = userEvent.setup();
    const clipboard = installClipboard();
    clipboard.writeText.mockRejectedValueOnce(
      Object.assign(new Error('Document is not focused.'), { name: 'NotAllowedError' }),
    );
    render(<ClipboardScenario />);
    await user.click(screen.getByRole('button', { name: 'Copy Docs link' }));
    expect(screen.getByText(/The browser blocked clipboard access/)).toBeInTheDocument();
    await waitFor(() => expect(region('assertive')).toHaveTextContent('Could not copy Docs link.'));
  });

  it('falls back to selecting the text in an insecure context', async () => {
    const user = userEvent.setup();
    installClipboard({ secure: false });
    render(<ClipboardScenario />);
    expect(screen.getByText('Clipboard API unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Copy/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select Code snippet' }));
    const field = screen.getByLabelText('Code snippet') as HTMLTextAreaElement;
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(field.value.length);
    expect(screen.getByText(/press/)).toHaveTextContent('Ctrl+C');
    expect(screen.getByRole('button', { name: 'Paste from clipboard' })).toBeDisabled();
  });

  it('pastes on demand and explains a denied read', async () => {
    const user = userEvent.setup();
    const clipboard = installClipboard();
    render(<ClipboardScenario />);
    expect(screen.getByText('clipboard-read: unsupported')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Paste from clipboard' }));
    expect(screen.getByLabelText('Pasted text')).toHaveValue('from clipboard');
    await waitFor(() => expect(region('polite')).toHaveTextContent('Pasted 14 characters.'));

    clipboard.readText?.mockRejectedValueOnce(
      Object.assign(new Error('Read permission denied.'), { name: 'NotAllowedError' }),
    );
    await user.click(screen.getByRole('button', { name: 'Paste from clipboard' }));
    expect(screen.getByText('Permission to read the clipboard was denied.')).toBeInTheDocument();
    expect(screen.getByLabelText('Pasted text')).toHaveValue('from clipboard');
  });

  it('shows the clipboard-read permission state where the Permissions API exists', async () => {
    userEvent.setup();
    installClipboard();
    const status = Object.assign(new EventTarget(), { state: 'prompt' as PermissionState });
    restores.push(
      overrideProperty(navigator, 'permissions', { query: vi.fn(() => Promise.resolve(status)) }),
    );
    render(<ClipboardScenario />);
    expect(await screen.findByText('clipboard-read: prompt')).toBeInTheDocument();
  });

  it('disables paste when only writing is supported', () => {
    userEvent.setup();
    installClipboard({ read: false });
    render(<ClipboardScenario />);
    expect(screen.getByRole('button', { name: 'Paste from clipboard' })).toBeDisabled();
    expect(
      screen.getByText('Reading the clipboard is not supported in this context.'),
    ).toBeInTheDocument();
  });
});
