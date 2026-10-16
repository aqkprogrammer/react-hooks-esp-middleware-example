import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useMutationObserver } from './useMutationObserver';

function Watched({
  onMutate,
  options,
}: {
  onMutate: (records: MutationRecord[]) => void;
  options: MutationObserverInit;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useMutationObserver(ref, onMutate, options);
  return <ul ref={ref} data-testid="list" />;
}

describe('useMutationObserver', () => {
  it('reports child list and attribute mutations', async () => {
    const onMutate = vi.fn();
    render(<Watched onMutate={onMutate} options={{ childList: true, attributes: true }} />);
    const list = screen.getByTestId('list');
    act(() => {
      list.appendChild(document.createElement('li'));
      list.setAttribute('data-state', 'busy');
    });
    await waitFor(() => expect(onMutate).toHaveBeenCalled());
    const records = onMutate.mock.calls.flatMap(([batch]) => batch as MutationRecord[]);
    expect(records.map((record) => record.type)).toEqual(['childList', 'attributes']);
  });

  it('does not re-observe for an equal options literal, and disconnects on unmount', () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const { rerender, unmount } = render(
      <Watched onMutate={vi.fn()} options={{ childList: true }} />,
    );
    rerender(<Watched onMutate={vi.fn()} options={{ childList: true }} />);
    expect(observe).toHaveBeenCalledTimes(1);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('stops reporting after unmount', async () => {
    const onMutate = vi.fn();
    const { unmount } = render(<Watched onMutate={onMutate} options={{ childList: true }} />);
    const list = screen.getByTestId('list');
    unmount();
    list.appendChild(document.createElement('li'));
    await Promise.resolve();
    expect(onMutate).not.toHaveBeenCalled();
  });

  it('reports unsupported browsers without crashing', () => {
    vi.stubGlobal('MutationObserver', undefined);
    const { result } = renderHook(() =>
      useMutationObserver(document.body, vi.fn(), { childList: true }),
    );
    expect(result.current.isSupported).toBe(false);
  });
});
