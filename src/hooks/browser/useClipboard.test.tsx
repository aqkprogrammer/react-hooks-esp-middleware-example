import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { useClipboard } from './useClipboard';

const restores: Array<() => void> = [];

function installClipboard(secure = true) {
  const clipboard = {
    writeText: vi.fn((_text: string) => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('pasted')),
  };
  restores.push(overrideProperty(window, 'isSecureContext', secure));
  restores.push(overrideProperty(navigator, 'clipboard', clipboard));
  return clipboard;
}

afterEach(() => {
  while (restores.length) restores.pop()?.();
  vi.useRealTimers();
});

describe('useClipboard', () => {
  it('copies text and resets `copied` after the timeout', async () => {
    vi.useFakeTimers();
    const clipboard = installClipboard();
    const { result } = renderHook(() => useClipboard({ resetAfterMs: 1000 }));
    expect(result.current.isSupported).toBe(true);

    let ok = false;
    await act(async () => {
      ok = await result.current.copy('npm test');
    });
    expect(ok).toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledWith('npm test');
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(999));
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.copied).toBe(false);
  });

  it('restarts the timer when copying again and clears it on unmount', async () => {
    vi.useFakeTimers();
    installClipboard();
    const { result, unmount } = renderHook(() => useClipboard({ resetAfterMs: 1000 }));
    await act(async () => {
      await result.current.copy('a');
    });
    act(() => vi.advanceTimersByTime(600));
    await act(async () => {
      await result.current.copy('b');
    });
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.copied).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports write failures (e.g. missing user activation) in `error`', async () => {
    const clipboard = installClipboard();
    clipboard.writeText.mockRejectedValueOnce(
      Object.assign(new Error('Document is not focused.'), { name: 'NotAllowedError' }),
    );
    const { result } = renderHook(() => useClipboard());
    let ok = true;
    await act(async () => {
      ok = await result.current.copy('x');
    });
    expect(ok).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error?.name).toBe('NotAllowedError');

    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it('is unsupported outside a secure context and fails gracefully', async () => {
    installClipboard(false);
    const { result } = renderHook(() => useClipboard());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isReadSupported).toBe(false);
    await act(async () => {
      await result.current.copy('x');
    });
    expect(result.current.error?.name).toBe('NotSupportedError');
  });

  it('is unsupported when navigator.clipboard is missing (jsdom)', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.isSupported).toBe(false);
  });

  it('reads text, and reports permission errors from read()', async () => {
    const clipboard = installClipboard();
    const { result } = renderHook(() => useClipboard());
    let text: string | null = null;
    await act(async () => {
      text = await result.current.read();
    });
    expect(text).toBe('pasted');

    clipboard.readText.mockRejectedValueOnce(
      Object.assign(new Error('Read permission denied.'), { name: 'NotAllowedError' }),
    );
    await act(async () => {
      text = await result.current.read();
    });
    expect(text).toBeNull();
    expect(result.current.error?.message).toBe('Read permission denied.');
  });

  it('ignores the result of an older, slower copy', async () => {
    const clipboard = installClipboard();
    let rejectFirst: (reason: unknown) => void = () => {};
    clipboard.writeText.mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => (rejectFirst = reject)),
    );
    const { result } = renderHook(() => useClipboard());
    let first: Promise<boolean> = Promise.resolve(true);
    act(() => {
      first = result.current.copy('slow');
    });
    await act(async () => {
      await result.current.copy('fast');
    });
    await act(async () => {
      rejectFirst(new Error('late failure'));
      await first;
    });
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
