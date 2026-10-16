/**
 * Test-only: jsdom implements `<dialog>` as a plain element (no `showModal`,
 * `close`, `returnValue` or Escape handling). This installs a minimal model of
 * the browser behaviour that `useDialogState` relies on:
 *
 * - `showModal()` sets `open` and focuses the first focusable descendant;
 * - Escape fires a cancelable `cancel` event and closes unless prevented;
 * - `close(value)` sets `returnValue`, removes `open` and fires `close`;
 * - submitting a `<form method="dialog">` closes its dialog with the
 *   submitter's `value` (jsdom would otherwise try to navigate).
 *
 * It deliberately does **not** restore focus on close, so tests prove the
 * hook does. Returns an uninstall function.
 */
export function installDialogPolyfill(): () => void {
  const proto = HTMLDialogElement.prototype;
  const originalShowModal = Object.getOwnPropertyDescriptor(proto, 'showModal');
  const originalClose = Object.getOwnPropertyDescriptor(proto, 'close');
  const originalReturnValue = Object.getOwnPropertyDescriptor(proto, 'returnValue');
  const returnValues = new WeakMap<HTMLDialogElement, string>();

  function onKeyDown(this: HTMLDialogElement, event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    const cancel = new Event('cancel', { cancelable: true });
    if (this.dispatchEvent(cancel)) this.close();
  }

  Object.defineProperty(proto, 'returnValue', {
    configurable: true,
    get(this: HTMLDialogElement) {
      return returnValues.get(this) ?? '';
    },
    set(this: HTMLDialogElement, value: string) {
      returnValues.set(this, String(value));
    },
  });
  Object.defineProperty(proto, 'showModal', {
    configurable: true,
    writable: true,
    value(this: HTMLDialogElement) {
      if (this.open) return;
      this.setAttribute('open', '');
      this.addEventListener('keydown', onKeyDown);
      const target =
        this.querySelector<HTMLElement>('[autofocus]') ??
        this.querySelector<HTMLElement>('button, input, select, textarea, a[href], [tabindex]');
      target?.focus();
    },
  });
  Object.defineProperty(proto, 'close', {
    configurable: true,
    writable: true,
    value(this: HTMLDialogElement, value?: string) {
      if (!this.open) return;
      if (value !== undefined) this.returnValue = value;
      this.removeAttribute('open');
      this.removeEventListener('keydown', onKeyDown);
      // Like browsers, focus inside a closed dialog is lost.
      if (this.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      this.dispatchEvent(new Event('close'));
    },
  });

  const onSubmit = (event: SubmitEvent) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.getAttribute('method') !== 'dialog') return;
    const dialog = form.closest('dialog');
    if (!dialog) return;
    event.preventDefault();
    const submitter = event.submitter;
    dialog.close(submitter instanceof HTMLButtonElement ? submitter.value : undefined);
  };
  document.addEventListener('submit', onSubmit);

  return () => {
    document.removeEventListener('submit', onSubmit);
    for (const [name, descriptor] of [
      ['showModal', originalShowModal],
      ['close', originalClose],
      ['returnValue', originalReturnValue],
    ] as const) {
      if (descriptor) Object.defineProperty(proto, name, descriptor);
      else Reflect.deleteProperty(proto, name);
    }
  };
}
