import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { overrideProperty } from '../../test/browserMocks';
import { parseCookies, serializeCookie, useCookie } from './useCookie';

function clearCookies() {
  for (const name of Object.keys(parseCookies(document.cookie))) {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0`;
  }
}

afterEach(clearCookies);

describe('serializeCookie / parseCookies', () => {
  it('encodes values so they cannot inject attributes', () => {
    expect(serializeCookie('note', 'a; Domain=evil.example', { maxAge: 60 })).toBe(
      'note=a%3B%20Domain%3Devil.example; Path=/; Max-Age=60; SameSite=Lax',
    );
    expect(parseCookies('note=a%3B%20b; other=1')).toEqual({ note: 'a; b', other: '1' });
  });

  it('adds Secure for SameSite=None and supports expires/domain', () => {
    const expires = new Date(Date.UTC(2030, 0, 1));
    expect(
      serializeCookie('x', '1', { sameSite: 'none', expires, domain: 'example.com', path: '/a' }),
    ).toBe(
      'x=1; Path=/a; Domain=example.com; Expires=Tue, 01 Jan 2030 00:00:00 GMT; SameSite=None; Secure',
    );
  });

  it('returns malformed encodings raw instead of throwing', () => {
    expect(parseCookies('bad=%E0%A4%A')).toEqual({ bad: '%E0%A4%A' });
  });
});

describe('useCookie', () => {
  it('reads, writes and removes a cookie', () => {
    document.cookie = 'locale=fr; Path=/';
    const { result } = renderHook(() => useCookie('locale'));
    expect(result.current[0]).toBe('fr');

    let ok = false;
    act(() => {
      ok = result.current[1]('pt-BR', { maxAge: 3600 });
    });
    expect(ok).toBe(true);
    expect(result.current[0]).toBe('pt-BR');
    expect(document.cookie).toContain('locale=pt-BR');

    act(() => result.current[2]());
    expect(result.current[0]).toBeNull();
    expect(document.cookie).not.toContain('locale=');
  });

  it('round-trips special characters', () => {
    const { result } = renderHook(() => useCookie('prefs'));
    act(() => void result.current[1]('{"a":"b c;d"}'));
    expect(result.current[0]).toBe('{"a":"b c;d"}');
  });

  it('keeps every component using the cookie in sync', () => {
    function Reader() {
      const [value] = useCookie('consent');
      return <p>consent: {value ?? 'unset'}</p>;
    }
    render(<Reader />);
    const { result } = renderHook(() => useCookie('consent'));
    act(() => void result.current[1]('granted'));
    expect(screen.getByText('consent: granted')).toBeInTheDocument();
  });

  it('re-reads when the tab becomes visible (cookie changed elsewhere)', () => {
    const { result } = renderHook(() => useCookie('theme'));
    document.cookie = 'theme=dark; Path=/';
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current[0]).toBe('dark');
  });

  it('reports a write the browser silently rejected', () => {
    // jsdom accepts any size, so emulate a browser dropping an oversized cookie.
    const native = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => native.get!.call(document) as string,
      set: (value: string) => {
        if (value.length <= 4096) native.set!.call(document, value);
      },
    });
    const onError = vi.fn();
    const { result } = renderHook(() => useCookie('huge', { onError }));
    let ok = true;
    act(() => {
      ok = result.current[1]('x'.repeat(5000));
    });
    delete (document as { cookie?: string }).cookie;
    expect(ok).toBe(false);
    expect(result.current[0]).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'write', name: 'huge' }));
  });

  it('reports disabled cookies', () => {
    const restore = overrideProperty(navigator, 'cookieEnabled', false);
    const onError = vi.fn();
    const { result } = renderHook(() => useCookie('any', { onError }));
    let ok = true;
    act(() => {
      ok = result.current[1]('v');
    });
    restore();
    expect(ok).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'unavailable' }));
  });

  it('removes listeners on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useCookie('x'));
    unmount();
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
