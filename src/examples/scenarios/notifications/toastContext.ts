import { createContext, use } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  /** Default `'info'`. `'error'` is announced assertively. */
  tone?: ToastTone;
  /**
   * Auto-dismiss after this many ms of *visible, unpaused* time. `null` keeps
   * the toast until dismissed. Defaults to the provider's `defaultDuration`,
   * except for errors, which default to `null` (an error must not vanish
   * before it is read).
   */
  duration?: number | null;
  /** One optional action. Toasts with actions should usually be sticky. */
  action?: ToastAction;
}

export interface ToastRecord {
  id: string;
  title: string;
  description: string | undefined;
  tone: ToastTone;
  duration: number | null;
  action: ToastAction | undefined;
}

export interface ToastApi {
  /** Show a toast (or queue it while the stack is full). Returns its id. */
  notify: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

/** The toast API from the nearest `<ToastProvider>`. Throws outside of one. */
export function useToasts(): ToastApi {
  const api = use(ToastContext);
  if (!api) throw new Error('useToasts must be used inside <ToastProvider>');
  return api;
}

export const TONE_LABEL: Record<ToastTone, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};
