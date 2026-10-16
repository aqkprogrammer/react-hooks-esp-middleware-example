import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';

afterEach(() => {
  document.title = '';
});

describe('useDocumentTitle', () => {
  it('sets the title and updates it when it changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Inbox' },
    });
    expect(document.title).toBe('Inbox');
    rerender({ title: 'Inbox (3)' });
    expect(document.title).toBe('Inbox (3)');
  });

  it('keeps the title on unmount by default', () => {
    document.title = 'App';
    const { unmount } = renderHook(() => useDocumentTitle('Settings'));
    unmount();
    expect(document.title).toBe('Settings');
  });

  it('restores the title from mount time when restoreOnUnmount is set', () => {
    document.title = 'App';
    const { rerender, unmount } = renderHook(
      ({ title }) => useDocumentTitle(title, { restoreOnUnmount: true }),
      { initialProps: { title: 'Editor' } },
    );
    rerender({ title: 'Editor *' });
    expect(document.title).toBe('Editor *');
    unmount();
    expect(document.title).toBe('App');
  });
});
