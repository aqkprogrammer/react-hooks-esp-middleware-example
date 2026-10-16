import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import UseSyncExternalStoreBrowserDemo from './UseSyncExternalStoreBrowserDemo';

describe('UseSyncExternalStoreBrowserDemo', () => {
  const restores: Array<() => void> = [];
  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
  });

  function goOffline() {
    restores.push(overrideProperty(navigator, 'onLine', false));
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
  }

  it('reflects navigator.onLine in every subscriber', async () => {
    const user = userEvent.setup();
    render(<UseSyncExternalStoreBrowserDemo />);
    expect(screen.getByRole('status')).toHaveTextContent('Online');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Saved 1 time')).toBeInTheDocument();

    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    expect(screen.getByRole('button', { name: 'Reconnecting…' })).toBeDisabled();

    restores.splice(0).forEach((restore) => restore());
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Online');
  });

  it('reflects document.visibilityState', () => {
    render(<UseSyncExternalStoreBrowserDemo />);
    expect(screen.getByText('visible')).toBeInTheDocument();
    restores.push(overrideProperty(document, 'visibilityState', 'hidden'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('hidden')).toBeInTheDocument();
  });

  it('removes its listeners on unmount', () => {
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<UseSyncExternalStoreBrowserDemo />);
    unmount();
    const windowTypes = removeWindow.mock.calls.map(([type]) => type);
    expect(windowTypes.filter((type) => type === 'online')).toHaveLength(2);
    expect(windowTypes.filter((type) => type === 'offline')).toHaveLength(2);
    expect(removeDocument.mock.calls.map(([type]) => type)).toContain('visibilitychange');
  });
});
