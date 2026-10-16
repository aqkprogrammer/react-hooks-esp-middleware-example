/**
 * Opt-in fakes for browser APIs that jsdom does not implement.
 *
 * They are *not* installed globally: hooks must feature-detect, and tests for
 * the "unsupported" path need the API to be missing. Install them per test with
 * `vi.stubGlobal` (restored automatically via `unstubGlobals: true`).
 */
import { act } from '@testing-library/react';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// matchMedia
// ---------------------------------------------------------------------------

export interface MatchMediaController {
  /** Flip whether `query` matches and notify listeners. */
  setMatches(query: string, matches: boolean): void;
}

export function installMatchMedia(initial: Record<string, boolean> = {}): MatchMediaController {
  const state = new Map<string, boolean>(Object.entries(initial));
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();

  const matchMedia = (query: string): MediaQueryList => {
    const set = listeners.get(query) ?? new Set();
    listeners.set(query, set);
    const list = {
      get matches() {
        return state.get(query) ?? false;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        set.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        set.delete(listener),
      addListener: (listener: (event: MediaQueryListEvent) => void) => set.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => set.delete(listener),
      dispatchEvent: () => true,
    };
    return list as unknown as MediaQueryList;
  };

  vi.stubGlobal('matchMedia', matchMedia);

  return {
    setMatches(query, matches) {
      state.set(query, matches);
      act(() => {
        listeners
          .get(query)
          ?.forEach((listener) => listener({ matches, media: query } as MediaQueryListEvent));
      });
    },
  };
}

// ---------------------------------------------------------------------------
// IntersectionObserver
// ---------------------------------------------------------------------------

export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  readonly scrollMargin = '0px';
  readonly delay = 0;
  readonly trackVisibility = false;
  readonly elements = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    const threshold = options.threshold ?? 0;
    this.thresholds = Array.isArray(threshold) ? threshold : [threshold];
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.elements.add(target);
  }
  unobserve(target: Element): void {
    this.elements.delete(target);
  }
  disconnect(): void {
    this.elements.clear();
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simulate `target` entering/leaving the viewport. */
  trigger(target: Element, isIntersecting: boolean, intersectionRatio = isIntersecting ? 1 : 0) {
    const entry = {
      target,
      isIntersecting,
      intersectionRatio,
      time: performance.now(),
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
    } as IntersectionObserverEntry;
    act(() => this.callback([entry], this));
  }

  static reset(): void {
    MockIntersectionObserver.instances = [];
  }

  /** Trigger on every live observer currently watching `target`. */
  static triggerAll(target: Element, isIntersecting: boolean): void {
    MockIntersectionObserver.instances
      .filter((observer) => observer.elements.has(target))
      .forEach((observer) => observer.trigger(target, isIntersecting));
  }
}

export function installIntersectionObserver(): typeof MockIntersectionObserver {
  MockIntersectionObserver.reset();
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  return MockIntersectionObserver;
}

// ---------------------------------------------------------------------------
// ResizeObserver
// ---------------------------------------------------------------------------

export class MockResizeObserver implements ResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly elements = new Set<Element>();
  disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }
  observe(target: Element): void {
    this.elements.add(target);
  }
  unobserve(target: Element): void {
    this.elements.delete(target);
  }
  disconnect(): void {
    this.elements.clear();
    this.disconnected = true;
  }

  /** Simulate `target` being resized to `width` x `height`. */
  resize(target: Element, width: number, height: number): void {
    const size = [{ inlineSize: width, blockSize: height }];
    const entry = {
      target,
      contentRect: { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0 },
      borderBoxSize: size,
      contentBoxSize: size,
      devicePixelContentBoxSize: size,
    } as unknown as ResizeObserverEntry;
    act(() => this.callback([entry], this));
  }

  static reset(): void {
    MockResizeObserver.instances = [];
  }

  static resizeAll(target: Element, width: number, height: number): void {
    MockResizeObserver.instances
      .filter((observer) => observer.elements.has(target))
      .forEach((observer) => observer.resize(target, width, height));
  }
}

export function installResizeObserver(): typeof MockResizeObserver {
  MockResizeObserver.reset();
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return MockResizeObserver;
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/** Original descriptors of every overridden property, keyed by target. */
const originals = new Map<object, Map<PropertyKey, PropertyDescriptor | undefined>>();

function restoreOriginal(target: object, key: PropertyKey): void {
  const byKey = originals.get(target);
  if (!byKey?.has(key)) return;
  const descriptor = byKey.get(key);
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else delete (target as Record<PropertyKey, unknown>)[key];
  byKey.delete(key);
  if (byKey.size === 0) originals.delete(target);
}

/**
 * Override a (possibly read-only) property on an object for one test.
 *
 * The returned function restores the property's *original* descriptor, so
 * nested overrides can be restored in any order. Anything still overridden is
 * restored automatically after each test (see ./setup.ts).
 */
export function overrideProperty<T extends object, K extends PropertyKey>(
  target: T,
  key: K,
  value: unknown,
): () => void {
  const byKey = originals.get(target) ?? new Map<PropertyKey, PropertyDescriptor | undefined>();
  originals.set(target, byKey);
  if (!byKey.has(key)) byKey.set(key, Object.getOwnPropertyDescriptor(target, key));
  Object.defineProperty(target, key, { configurable: true, get: () => value });
  return () => restoreOriginal(target, key);
}

/** Restores every property overridden with `overrideProperty`. */
export function restoreOverriddenProperties(): void {
  for (const [target, byKey] of [...originals]) {
    for (const key of [...byKey.keys()]) restoreOriginal(target, key);
  }
}

/** Set `document.visibilityState` and dispatch `visibilitychange`. */
export function setDocumentVisibility(state: DocumentVisibilityState): () => void {
  const restoreState = overrideProperty(document, 'visibilityState', state);
  const restoreHidden = overrideProperty(document, 'hidden', state === 'hidden');
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  return () => {
    restoreState();
    restoreHidden();
  };
}

/** Set `navigator.onLine` and dispatch the matching window event. */
export function setOnline(online: boolean): () => void {
  const restore = overrideProperty(navigator, 'onLine', online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
  return restore;
}
