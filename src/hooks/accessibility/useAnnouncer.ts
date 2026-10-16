import { useCallback, useEffect } from 'react';
import { isBrowser } from '../internal/env';

export type Politeness = 'polite' | 'assertive';

export interface AnnounceOptions {
  /**
   * `polite` (default) waits until the screen reader is idle — use it for
   * status updates ("Saved", "3 results"). `assertive` interrupts — reserve it
   * for urgent errors.
   */
  politeness?: Politeness;
  /** Remove the text after this long so stale messages are not found later. Default `7000`. */
  clearAfterMs?: number;
}

export interface UseAnnouncerResult {
  /** Announce `message` to screen readers. Repeating the same text announces it again. */
  announce: (message: string, options?: AnnounceOptions) => void;
  /** Empty both live regions immediately. */
  clear: () => void;
}

/** Delay between emptying and filling a region, so repeated text is re-announced. */
export const ANNOUNCE_DELAY_MS = 100;

interface Region {
  element: HTMLElement;
  fillTimer?: ReturnType<typeof setTimeout>;
  clearTimer?: ReturnType<typeof setTimeout>;
}

const regions = new Map<Politeness, Region>();
let subscribers = 0;

const HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';

function ensureRegion(politeness: Politeness): Region {
  const existing = regions.get(politeness);
  if (existing?.element.isConnected) return existing;
  const element = document.createElement('div');
  element.setAttribute('aria-live', politeness);
  element.setAttribute('aria-atomic', 'true');
  element.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
  element.setAttribute('data-live-announcer', politeness);
  element.setAttribute('style', HIDDEN_STYLE);
  document.body.append(element);
  const region: Region = { element };
  regions.set(politeness, region);
  return region;
}

function resetRegion(region: Region) {
  clearTimeout(region.fillTimer);
  clearTimeout(region.clearTimer);
  region.element.textContent = '';
}

function removeRegions() {
  for (const region of regions.values()) {
    resetRegion(region);
    region.element.remove();
  }
  regions.clear();
}

/**
 * Announces messages to screen-reader users through `aria-live` regions —
 * for changes that are not otherwise conveyed by focus: "Item added to
 * cart", "5 results", "Saved", "Connection lost".
 *
 * Every component shares **one** polite and **one** assertive region,
 * appended to `<body>` when the first announcer mounts (live regions must
 * exist *before* their content changes to be reliably announced) and removed
 * when the last one unmounts. Nothing is rendered on the server.
 *
 * Prefer visible, semantic feedback where possible (e.g. an inline
 * `role="status"` element next to the control); use this for app-wide
 * messages that have no natural place in the layout.
 */
export function useAnnouncer(): UseAnnouncerResult {
  useEffect(() => {
    subscribers += 1;
    ensureRegion('polite');
    ensureRegion('assertive');
    return () => {
      subscribers -= 1;
      if (subscribers === 0) removeRegions();
    };
  }, []);

  const announce = useCallback((message: string, options: AnnounceOptions = {}) => {
    // No mounted announcer (server, or called after unmount): nothing to do.
    if (!isBrowser || subscribers === 0) return;
    const { politeness = 'polite', clearAfterMs = 7000 } = options;
    const region = ensureRegion(politeness);
    resetRegion(region);
    region.fillTimer = setTimeout(() => {
      region.element.textContent = message;
      region.clearTimer = setTimeout(() => {
        region.element.textContent = '';
      }, clearAfterMs);
    }, ANNOUNCE_DELAY_MS);
  }, []);

  const clear = useCallback(() => {
    for (const region of regions.values()) resetRegion(region);
  }, []);

  return { announce, clear };
}
