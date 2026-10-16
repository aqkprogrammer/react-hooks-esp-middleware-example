import { useCallback, useEffect, useRef, useState } from 'react';
import { isBrowser } from '../internal/env';
import { toErrorLike, useIsSupported } from './shared';

export interface UseClipboardOptions {
  /** How long `copied` stays `true` after a successful copy. Default `2000` ms; `0` keeps it until the next copy/reset. */
  resetAfterMs?: number;
}

export interface UseClipboardResult {
  /** Writes `text`; resolves `true` on success. Never rejects — failures go to `error`. */
  copy: (text: string) => Promise<boolean>;
  /**
   * Reads text from the clipboard; resolves `null` on failure. Browsers guard
   * this more strictly than writing: Chromium asks for the `clipboard-read`
   * permission, Safari and Firefox show a "Paste" confirmation. Call it from a
   * user gesture.
   */
  read: () => Promise<string | null>;
  /** `true` for `resetAfterMs` after the last successful `copy`. */
  copied: boolean;
  /** The last failure of `copy` or `read`, cleared by the next success or `reset()`. */
  error: Error | null;
  /** Clears `copied` and `error`. */
  reset: () => void;
  /** `navigator.clipboard.writeText` is available (secure context only). */
  isSupported: boolean;
  /** `navigator.clipboard.readText` is available (secure context only). */
  isReadSupported: boolean;
}

function getClipboard(): Clipboard | null {
  if (!isBrowser || !window.isSecureContext) return null;
  return typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;
}

const supportsWrite = () => typeof getClipboard()?.writeText === 'function';
const supportsRead = () => typeof getClipboard()?.readText === 'function';

/**
 * Copy to (and optionally read from) the clipboard with the async Clipboard
 * API, with "Copied!" feedback that resets itself.
 *
 * - Feature-detected: the API only exists in **secure contexts** (HTTPS or
 *   `localhost`); on plain HTTP `isSupported` is `false` and `copy` reports a
 *   `NotSupportedError` instead of throwing.
 * - `writeText` works from a click handler in all modern browsers; Safari and
 *   Firefox require it to run during a user gesture (transient activation).
 * - Only the latest call updates state; the reset timer is cleared on unmount
 *   and when copying again.
 *
 * The deprecated `document.execCommand('copy')` fallback is intentionally not
 * included.
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardResult {
  const { resetAfterMs = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isSupported = useIsSupported(supportsWrite);
  const isReadSupported = useIsSupported(supportsRead);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Incremented per call so a slow, older promise cannot overwrite newer state.
  const callRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const copy = useCallback(
    async (text: string) => {
      const call = ++callRef.current;
      clearTimer();
      try {
        const clipboard = getClipboard();
        if (!clipboard || typeof clipboard.writeText !== 'function') {
          throw new DOMException(
            'The Clipboard API is unavailable (it requires a secure context: HTTPS or localhost).',
            'NotSupportedError',
          );
        }
        await clipboard.writeText(text);
        if (call !== callRef.current) return true;
        setError(null);
        setCopied(true);
        if (resetAfterMs > 0) {
          timerRef.current = setTimeout(() => {
            timerRef.current = undefined;
            setCopied(false);
          }, resetAfterMs);
        }
        return true;
      } catch (caught) {
        if (call === callRef.current) {
          setCopied(false);
          setError(toErrorLike(caught));
        }
        return false;
      }
    },
    [clearTimer, resetAfterMs],
  );

  const read = useCallback(async () => {
    const call = ++callRef.current;
    try {
      const clipboard = getClipboard();
      if (!clipboard || typeof clipboard.readText !== 'function') {
        throw new DOMException('Reading the clipboard is not supported here.', 'NotSupportedError');
      }
      const text = await clipboard.readText();
      if (call === callRef.current) setError(null);
      return text;
    } catch (caught) {
      if (call === callRef.current) setError(toErrorLike(caught));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    callRef.current += 1;
    clearTimer();
    setCopied(false);
    setError(null);
  }, [clearTimer]);

  return { copy, read, copied, error, reset, isSupported, isReadSupported };
}
