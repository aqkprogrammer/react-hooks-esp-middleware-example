import { useEffect, useState } from 'react';
import { isBrowser, toError } from '../internal/env';
import { useBrowserSupport } from '../device/support';

/**
 * Permission names. TypeScript's DOM library lists the widely supported ones;
 * browsers accept more (`clipboard-read`, `local-fonts`, …) and reject names
 * they do not know with a `TypeError`.
 */
export type PermissionQueryName = PermissionName | (string & {});

export type PermissionStatusResult =
  /** The Permissions API is missing (old browsers, some WebViews, the server). */
  | 'unsupported'
  /** Waiting for `navigator.permissions.query()`. */
  | 'pending'
  /** The query failed — usually a permission name this browser does not support. */
  | 'error'
  | PermissionState;

export interface PermissionResult {
  isSupported: boolean;
  /** `granted`, `denied`, `prompt`, or one of the meta states above. */
  status: PermissionStatusResult;
  /** Shorthand for `status` when it is a real permission state, else `null`. */
  state: PermissionState | null;
  error: Error | null;
}

interface Internal {
  name: PermissionQueryName;
  state: PermissionState | null;
  error: Error | null;
}

const detect = () =>
  isBrowser &&
  typeof navigator.permissions === 'object' &&
  navigator.permissions !== null &&
  typeof navigator.permissions.query === 'function';

/**
 * Reports the state of a permission (`granted` / `denied` / `prompt`) and
 * follows changes — e.g. the user flips it in the site settings, or grants it
 * through a prompt triggered elsewhere.
 *
 * **This never prompts.** `navigator.permissions.query()` only reads the
 * state; ask for the permission with the feature's own API
 * (`getUserMedia`, `Notification.requestPermission()`,
 * `geolocation.getCurrentPosition`) from a user action.
 *
 * Support varies by name: e.g. Firefox rejects `camera`/`microphone` in some
 * versions and Safari supports a short list. Unsupported names produce
 * `status: 'error'` — treat that like "unknown" and fall back to trying the
 * feature itself.
 */
export function usePermission(name: PermissionQueryName): PermissionResult {
  const isSupported = useBrowserSupport(detect);
  const [internal, setInternal] = useState<Internal>({ name, state: null, error: null });

  useEffect(() => {
    if (!detect()) return;
    let cancelled = false;
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (!cancelled && status) setInternal({ name, state: status.state, error: null });
    };

    navigator.permissions.query({ name } as PermissionDescriptor).then(
      (result) => {
        if (cancelled) return;
        status = result;
        result.addEventListener('change', onChange);
        onChange();
      },
      (reason: unknown) => {
        if (!cancelled) setInternal({ name, state: null, error: toError(reason) });
      },
    );

    return () => {
      cancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, [name]);

  if (!isSupported) return { isSupported, status: 'unsupported', state: null, error: null };
  // A result for a previous `name` is never shown for the new one.
  const current = internal.name === name ? internal : null;
  if (current?.error) return { isSupported, status: 'error', state: null, error: current.error };
  if (current?.state)
    return { isSupported, status: current.state, state: current.state, error: null };
  return { isSupported, status: 'pending', state: null, error: null };
}
