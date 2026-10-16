import { useEffect, useState } from 'react';
import { isBrowser, toError } from '../internal/env';
import { useBrowserSupport } from './support';

/**
 * The parts of `BatteryManager` this hook reads. Declared locally because
 * the Battery Status API is not part of TypeScript's DOM library.
 */
export interface BatteryManagerLike extends EventTarget {
  readonly charging: boolean;
  /** Seconds until full; `Infinity` when discharging or unknown. */
  readonly chargingTime: number;
  /** Seconds until empty; `Infinity` when charging or unknown. */
  readonly dischargingTime: number;
  /** 0 … 1. */
  readonly level: number;
}

type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<BatteryManagerLike> };

export interface BatterySnapshot {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

export interface BatteryState {
  /** `navigator.getBattery` exists (Chromium-based browsers only). */
  isSupported: boolean;
  /** Waiting for `getBattery()` to resolve. */
  loading: boolean;
  /** `null` until loaded, when unsupported, or on error. */
  battery: BatterySnapshot | null;
  /** E.g. a `SecurityError` when a Permissions-Policy blocks `battery` in an iframe. */
  error: Error | null;
}

const BATTERY_EVENTS = [
  'chargingchange',
  'chargingtimechange',
  'dischargingtimechange',
  'levelchange',
] as const;

const detect = () =>
  isBrowser && typeof (navigator as NavigatorWithBattery).getBattery === 'function';

const read = (manager: BatteryManagerLike): BatterySnapshot => ({
  charging: manager.charging,
  chargingTime: manager.chargingTime,
  dischargingTime: manager.dischargingTime,
  level: manager.level,
});

/**
 * Reads the Battery Status API (`navigator.getBattery()`) and follows its
 * change events.
 *
 * **Compatibility:** Chromium-based browsers only. Firefox removed the API
 * (it was used for fingerprinting) and Safari never shipped it, so always
 * render a fallback for `isSupported === false`. It is also only exposed in
 * secure contexts.
 *
 * **Privacy:** precise level and charge times are a fingerprinting vector;
 * use the data for UX hints (e.g. "pause video autoplay on low battery"),
 * never for tracking. No permission prompt is involved.
 */
export function useBattery(): BatteryState {
  const isSupported = useBrowserSupport(detect);
  const [battery, setBattery] = useState<BatterySnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!isBrowser || typeof nav.getBattery !== 'function') return;
    let cancelled = false;
    let manager: BatteryManagerLike | null = null;
    const update = () => {
      if (manager && !cancelled) setBattery(read(manager));
    };

    nav.getBattery().then(
      (result) => {
        if (cancelled) return;
        manager = result;
        for (const type of BATTERY_EVENTS) result.addEventListener(type, update);
        update();
      },
      (reason: unknown) => {
        if (!cancelled) setError(toError(reason));
      },
    );

    return () => {
      cancelled = true;
      const current = manager;
      if (current) {
        for (const type of BATTERY_EVENTS) current.removeEventListener(type, update);
      }
    };
  }, []);

  return {
    isSupported,
    loading: isSupported && battery === null && error === null,
    battery,
    error,
  };
}
