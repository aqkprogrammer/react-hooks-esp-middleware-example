import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setDocumentVisibility } from '../../test/browserMocks';
import { usePageVisibility } from './usePageVisibility';

describe('usePageVisibility', () => {
  it('follows document.visibilityState', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
    const restoreHidden = setDocumentVisibility('hidden');
    expect(result.current).toBe(false);
    restoreHidden();
    const restoreVisible = setDocumentVisibility('visible');
    expect(result.current).toBe(true);
    restoreVisible();
  });

  it('unsubscribes on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => usePageVisibility());
    unmount();
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
