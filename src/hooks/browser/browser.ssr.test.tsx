// Runs in the "ssr" Vitest project (Node, no DOM) to prove the browser hooks
// render on the server without touching window/document/navigator.
import { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useClickOutside } from './useClickOutside';
import { useClipboard } from './useClipboard';
import { useDocumentTitle } from './useDocumentTitle';
import { useElementSize } from './useElementSize';
import { useFocus } from './useFocus';
import { useFocusWithin } from './useFocusWithin';
import { useFullscreen } from './useFullscreen';
import { useGeolocation } from './useGeolocation';
import { useHover } from './useHover';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useMutationObserver } from './useMutationObserver';
import { useNetworkInformation } from './useNetworkInformation';
import { useOnlineStatus } from './useOnlineStatus';
import { usePageVisibility } from './usePageVisibility';
import { usePreferredColorScheme } from './usePreferredColorScheme';
import { useReducedMotion } from './useReducedMotion';
import { useResizeObserver } from './useResizeObserver';
import { useScrollLock } from './useScrollLock';
import { useScrollPosition } from './useScrollPosition';
import { useWindowSize } from './useWindowSize';

function Everything() {
  const panel = useRef<HTMLDivElement>(null);
  useClickOutside(panel, () => {});
  useDocumentTitle('Server');
  useScrollLock(true);
  useResizeObserver(panel, () => {});
  const mutation = useMutationObserver(panel, () => {}, { childList: true });
  const [hoverRef, isHovered] = useHover<HTMLDivElement>();
  const [focusRef, isFocused] = useFocus<HTMLInputElement>();
  const [groupRef, isFocusWithin] = useFocusWithin<HTMLFieldSetElement>();
  // Destructure results that contain a callback `ref`: the React Compiler
  // treats an object with a `ref` property as a ref and forbids reading it
  // during render.
  const {
    ref: visibilityRef,
    isIntersecting,
    isSupported: ioSupported,
  } = useIntersectionObserver<HTMLDivElement>({ initialIsIntersecting: true });
  const {
    ref: sizeRef,
    width,
    height,
  } = useElementSize<HTMLDivElement>({ initialSize: { width: 10, height: 20 } });
  const {
    ref: fullscreenRef,
    isFullscreen,
    isSupported: fullscreenSupported,
  } = useFullscreen<HTMLDivElement>();
  const clipboard = useClipboard();
  const geo = useGeolocation();
  const windowSize = useWindowSize({ serverSize: { width: 1280, height: 720 } });
  const scroll = useScrollPosition();
  const values = {
    hovered: isHovered,
    focused: isFocused,
    focusWithin: isFocusWithin,
    intersecting: isIntersecting,
    ioSupported,
    size: `${width}x${height}`,
    fullscreen: isFullscreen,
    fullscreenSupported,
    clipboard: clipboard.isSupported,
    geo: `${geo.status}/${geo.isSupported}`,
    window: `${windowSize.width}x${windowSize.height}`,
    scroll: `${scroll.x},${scroll.y}`,
    online: useOnlineStatus(),
    visible: usePageVisibility(),
    scheme: usePreferredColorScheme(),
    reducedMotion: useReducedMotion(),
    network: useNetworkInformation().isSupported,
    mutationSupported: mutation.isSupported,
  };
  return (
    <div ref={panel}>
      <div ref={hoverRef} />
      <input ref={focusRef} aria-label="x" />
      <fieldset ref={groupRef} />
      <div ref={visibilityRef} />
      <div ref={sizeRef} />
      <div ref={fullscreenRef} />
      <pre>{JSON.stringify(values)}</pre>
    </div>
  );
}

describe('browser hooks on the server', () => {
  it('render deterministic server defaults without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const html = renderToString(<Everything />);
    const json = html.match(/<pre>(.*)<\/pre>/)?.[1]?.replaceAll('&quot;', '"') ?? '{}';
    expect(JSON.parse(json)).toEqual({
      hovered: false,
      focused: false,
      focusWithin: false,
      intersecting: true,
      ioSupported: false,
      size: '10x20',
      fullscreen: false,
      fullscreenSupported: false,
      clipboard: false,
      geo: 'idle/false',
      window: '1280x720',
      scroll: '0,0',
      online: true,
      visible: true,
      scheme: 'no-preference',
      reducedMotion: false,
      network: false,
      mutationSupported: false,
    });
  });
});
