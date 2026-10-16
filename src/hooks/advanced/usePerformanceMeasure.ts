import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { isBrowser, noop } from '../internal/env';
import { useBrowserSupport } from '../device/support';

export type MeasurementStatus = 'success' | 'error' | 'manual';

export interface PerformanceMeasurement {
  /** Full User Timing entry name: `<namespace>:<label>`. */
  name: string;
  label: string;
  /** Milliseconds. */
  duration: number;
  /** Milliseconds since `performance.timeOrigin`. */
  startTime: number;
  /** `success`/`error` for `measure()`, `manual` for `start()`…`end()`. */
  status: MeasurementStatus;
}

export interface UsePerformanceMeasureOptions {
  /**
   * Prefix for mark/measure names, visible in the browser's Performance
   * panel. Defaults to a per-component id. Measures created anywhere on the
   * page (even outside React) whose name starts with `<namespace>:` are
   * collected too when `PerformanceObserver` is available.
   */
  namespace?: string;
  /** Keep at most this many measurements, newest first (default 50). */
  maxEntries?: number;
}

export interface PerformanceMeasureControls {
  /** `performance.mark` and `performance.measure` exist. */
  isSupported: boolean;
  /** Measurements are collected with a `PerformanceObserver` (otherwise read back directly). */
  usesObserver: boolean;
  /** Newest first. */
  measurements: readonly PerformanceMeasurement[];
  /** Starts a span and returns the function that ends it. Ending twice is a no-op. */
  start: (label: string) => (status?: MeasurementStatus) => void;
  /** Times `work` (sync or async), recording `success` or `error`; re-throws errors. */
  measure: <T>(label: string, work: () => T | Promise<T>) => Promise<T>;
  /** Forgets the recorded measurements and clears this hook's marks/measures. */
  clear: () => void;
  namespace: string;
}

interface MeasureDetail {
  label: string;
  status: MeasurementStatus;
}

const detect = () =>
  isBrowser &&
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.measure === 'function';

const detectObserver = () =>
  detect() &&
  typeof PerformanceObserver === 'function' &&
  Array.isArray(PerformanceObserver.supportedEntryTypes) &&
  PerformanceObserver.supportedEntryTypes.includes('measure');

const subscribeNever = () => noop;
const serverFalse = () => false;

function isMeasureDetail(value: unknown): value is MeasureDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MeasureDetail).label === 'string' &&
    typeof (value as MeasureDetail).status === 'string'
  );
}

function toMeasurement(entry: PerformanceEntry, prefix: string): PerformanceMeasurement {
  const detail: unknown = (entry as PerformanceMeasure).detail;
  return {
    name: entry.name,
    label: isMeasureDetail(detail) ? detail.label : entry.name.slice(prefix.length),
    duration: entry.duration,
    startTime: entry.startTime,
    status: isMeasureDetail(detail) ? detail.status : 'manual',
  };
}

/**
 * Times work with the User Timing API (`performance.mark` /
 * `performance.measure`), so the spans also appear in the browser's
 * Performance panel, and collects the results as state.
 *
 * Where supported, results are gathered with a `PerformanceObserver` (which
 * delivers entries asynchronously, outside the critical path); otherwise each
 * measure is read back right after it is created.
 *
 * Meant for async work and interactions (`measure('save', () => api.save())`).
 * To time React renders use `<Profiler>` or the React Performance tracks in
 * DevTools: marking inside the render body would be a side effect during render.
 */
export function usePerformanceMeasure(
  options: UsePerformanceMeasureOptions = {},
): PerformanceMeasureControls {
  const generatedId = useId();
  const { namespace = `perf${generatedId}`, maxEntries = 50 } = options;
  const isSupported = useBrowserSupport(detect);
  const usesObserver = useSyncExternalStore(subscribeNever, detectObserver, serverFalse);
  const [measurements, setMeasurements] = useState<readonly PerformanceMeasurement[]>([]);
  const prefix = `${namespace}:`;

  const observingRef = useRef(false);
  const sequenceRef = useRef(0);
  const ownedMarksRef = useRef(new Set<string>());
  const ownedMeasuresRef = useRef(new Set<string>());

  const record = useCallback(
    (entries: PerformanceMeasurement[]) => {
      if (entries.length === 0) return;
      setMeasurements((previous) => [...entries.reverse(), ...previous].slice(0, maxEntries));
    },
    [maxEntries],
  );

  useEffect(() => {
    if (!detectObserver()) return;
    const observer = new PerformanceObserver((list) => {
      record(
        list
          .getEntries()
          .filter((entry) => entry.entryType === 'measure' && entry.name.startsWith(prefix))
          .map((entry) => toMeasurement(entry, prefix)),
      );
    });
    observer.observe({ type: 'measure' });
    observingRef.current = true;
    return () => {
      observingRef.current = false;
      observer.disconnect();
    };
  }, [prefix, record]);

  const clearEntries = useCallback(() => {
    if (!detect()) return;
    for (const name of ownedMarksRef.current) performance.clearMarks(name);
    for (const name of ownedMeasuresRef.current) performance.clearMeasures(name);
    ownedMarksRef.current.clear();
    ownedMeasuresRef.current.clear();
  }, []);

  // Do not leave entries in the global performance buffer after unmount.
  useEffect(() => clearEntries, [clearEntries]);

  const start = useCallback(
    (label: string) => {
      if (!detect()) return noop;
      sequenceRef.current += 1;
      const startMark = `${prefix}${label}:start:${sequenceRef.current}`;
      performance.mark(startMark);
      ownedMarksRef.current.add(startMark);
      let ended = false;

      return (status: MeasurementStatus = 'manual') => {
        if (ended) return;
        ended = true;
        const name = `${prefix}${label}`;
        const detail: MeasureDetail = { label, status };
        let entry: PerformanceMeasure | undefined;
        try {
          entry = performance.measure(name, { start: startMark, detail });
        } catch {
          // Engines without User Timing Level 3 options: fall back to the
          // two-argument form (no detail).
          entry = performance.measure(name, startMark) ?? undefined;
        }
        ownedMeasuresRef.current.add(name);
        performance.clearMarks(startMark);
        ownedMarksRef.current.delete(startMark);
        if (observingRef.current) return;
        // No observer: read the entry back synchronously.
        const fallback = entry ?? performance.getEntriesByName(name, 'measure').at(-1);
        if (fallback) record([{ ...toMeasurement(fallback, prefix), label, status }]);
      };
    },
    [prefix, record],
  );

  const measure = useCallback(
    async <T>(label: string, work: () => T | Promise<T>): Promise<T> => {
      const end = start(label);
      try {
        const result = await work();
        end('success');
        return result;
      } catch (error) {
        end('error');
        throw error;
      }
    },
    [start],
  );

  const clear = useCallback(() => {
    clearEntries();
    setMeasurements([]);
  }, [clearEntries]);

  return { isSupported, usesObserver, measurements, start, measure, clear, namespace };
}
