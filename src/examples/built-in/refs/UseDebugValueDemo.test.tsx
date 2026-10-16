import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../../test/browserMocks';
import {
  formatLastInteraction,
  formatOnlineStatus,
  resetLastInteraction,
  useLastInteractionDebug,
  useOnlineStatusDebug,
} from './debugValueHooks';
import UseDebugValueDemo from './UseDebugValueDemo';

describe('debug value hooks', () => {
  beforeEach(() => {
    resetLastInteraction();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats the DevTools labels', () => {
    expect(formatOnlineStatus(true)).toBe('Online');
    expect(formatOnlineStatus(false)).toBe('Offline');
    expect(formatLastInteraction(null)).toBe('no interaction yet');
    const at = new Date(2026, 0, 1, 14, 3, 12).getTime();
    expect(formatLastInteraction(at)).toBe(new Date(at).toLocaleTimeString());
  });

  it('useOnlineStatusDebug follows online/offline events', () => {
    const { result } = renderHook(() => useOnlineStatusDebug());
    expect(result.current).toBe(true);
    const restore = overrideProperty(navigator, 'onLine', false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
    restore();
  });

  it('useLastInteractionDebug records the time of the last pointerdown/keydown', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
    const { result } = renderHook(() => useLastInteractionDebug());
    expect(result.current).toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: 'a' });
    });
    expect(result.current).toBe(new Date(2026, 0, 1, 9, 0, 0).getTime());
  });

  it('shares one window listener pair and removes it with the last subscriber', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const first = renderHook(() => useLastInteractionDebug());
    const second = renderHook(() => useLastInteractionDebug());
    expect(add.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
    first.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0);
    second.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
  });
});

describe('UseDebugValueDemo', () => {
  beforeEach(() => {
    resetLastInteraction();
  });

  it('previews the DevTools labels for the current values', () => {
    render(<UseDebugValueDemo />);
    const labels = within(screen.getByLabelText('DevTools labels'));
    expect(labels.getByText('Online')).toBeInTheDocument();
    expect(labels.getByText('no interaction yet')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(labels.queryByText('no interaction yet')).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Hook return values')).queryByText('null'),
    ).not.toBeInTheDocument();
  });
});
