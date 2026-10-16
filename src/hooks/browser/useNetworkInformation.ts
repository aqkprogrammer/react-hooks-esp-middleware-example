import { useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';

export type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

/** The subset of the (non-standard track) `NetworkInformation` interface used here. */
interface NetworkInformationLike extends EventTarget {
  readonly effectiveType?: EffectiveConnectionType;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
  readonly type?: string;
}

export interface NetworkInformationState {
  /** `navigator.connection` exists. Chromium-based browsers only; `false` in Firefox and Safari. */
  isSupported: boolean;
  /** Estimated class of the connection, based on recently observed rtt/downlink. */
  effectiveType?: EffectiveConnectionType;
  /** Estimated downlink in Mbit/s, rounded to 25 kbit/s and capped by the browser for privacy. */
  downlink?: number;
  /** Estimated round-trip time in ms, rounded to 25 ms. */
  rtt?: number;
  /** The user enabled a data-saver mode. */
  saveData?: boolean;
  /** Physical connection type (`wifi`, `cellular`…). Only on Android/ChromeOS. */
  type?: string;
}

function getConnection(): NetworkInformationLike | null {
  if (!isBrowser || typeof navigator === 'undefined') return null;
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return connection ?? null;
}

const UNSUPPORTED: NetworkInformationState = { isSupported: false };
let cached: NetworkInformationState = UNSUPPORTED;

function getSnapshot(): NetworkInformationState {
  const connection = getConnection();
  if (!connection) return UNSUPPORTED;
  const { effectiveType, downlink, rtt, saveData, type } = connection;
  if (
    cached.isSupported &&
    cached.effectiveType === effectiveType &&
    cached.downlink === downlink &&
    cached.rtt === rtt &&
    cached.saveData === saveData &&
    cached.type === type
  ) {
    return cached;
  }
  cached = { isSupported: true, effectiveType, downlink, rtt, saveData, type };
  return cached;
}

function subscribe(onChange: () => void) {
  const connection = getConnection();
  if (!connection) return noop;
  connection.addEventListener('change', onChange);
  return () => connection.removeEventListener('change', onChange);
}

const getServerSnapshot = () => UNSUPPORTED;

/**
 * Connection quality hints from the Network Information API
 * (`navigator.connection`): `effectiveType`, `downlink`, `rtt`, `saveData`.
 *
 * **Chromium-only.** Firefox and Safari do not implement it, so
 * `isSupported` is `false` there and every field is `undefined` — treat the
 * values as optional progressive enhancement (e.g. load low-resolution media
 * when `saveData` or `effectiveType` is `'2g'`), never as a requirement.
 *
 * Values are coarse estimates, deliberately rounded and capped by the browser
 * to limit fingerprinting. On the server and during hydration the result is
 * `{ isSupported: false }`.
 */
export function useNetworkInformation(): NetworkInformationState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
