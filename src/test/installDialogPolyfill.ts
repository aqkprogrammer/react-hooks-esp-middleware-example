/**
 * Test-only: jsdom implements `<dialog>` as a plain element (no `showModal`,
 * `close`, `returnValue` or Escape handling). This installs a minimal model of
 * the browser behaviour that `useDialogState` relies on:
 *
 * - `showModal()` sets `open` and focuses the first focusable descendant;
 * - Escape fires a cancelable `cancel` event on the *topmost* modal dialog
 *   and closes it unless prevented (or the keydown's default was prevented);
 * - `close(value)` sets `returnValue`, removes `open` and fires `close`;
 * - submitting a `<form method="dialog">` closes its dialog with the
 *   submitter's `value`, unless a submit handler called `preventDefault()`
 *   (jsdom would otherwise try to navigate).
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
  /** Open modal dialogs, topmost last (browsers' "top layer"). */
  const modalStack: HTMLDialogElement[] = [];

  // Bubble phase on document, so element handlers run first and can prevent it.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const top = modalStack.at(-1);
    if (!top) return;
    const cancel = new Event('cancel', { cancelable: true });
    if (top.dispatchEvent(cancel)) top.close();
  };
  document.addEventListener('keydown', onKeyDown);

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
      modalStack.push(this);
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
      const index = modalStack.indexOf(this);
      if (index !== -1) modalStack.splice(index, 1);
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
    const prevented = event.defaultPrevented;
    event.preventDefault(); // stop jsdom's unimplemented navigation either way
    if (prevented) return;
    const submitter = event.submitter;
    dialog.close(submitter instanceof HTMLButtonElement ? submitter.value : undefined);
  };
  document.addEventListener('submit', onSubmit);

  return () => {
    document.removeEventListener('submit', onSubmit);
    document.removeEventListener('keydown', onKeyDown);
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
