const CANDIDATES = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isNamedRadio(element: Element): element is HTMLInputElement {
  return element instanceof HTMLInputElement && element.type === 'radio' && element.name !== '';
}

function isHidden(element: HTMLElement): boolean {
  if (element.closest('[hidden], [inert]')) return true;
  // `checkVisibility` (all evergreen browsers since 2024) also catches
  // `display: none`, `visibility: hidden` and closed <details>. Without it
  // (old browsers, jsdom) the attribute checks above are the fallback.
  if (typeof element.checkVisibility === 'function') {
    return !element.checkVisibility({ visibilityProperty: true });
  }
  return false;
}

/**
 * Elements inside `container` that the Tab key can reach, in DOM order.
 *
 * Excludes disabled controls (including inside a disabled `<fieldset>`),
 * `tabindex="-1"`, hidden/inert subtrees and all but one radio button per
 * group (the checked one, or the first). Positive `tabindex` values are
 * treated like `0` — avoid them, they break the natural order.
 */
export function getTabbableElements(container: ParentNode): HTMLElement[] {
  const elements = [...container.querySelectorAll<HTMLElement>(CANDIDATES)].filter(
    (element) => element.tabIndex >= 0 && !element.matches(':disabled') && !isHidden(element),
  );
  const radios = elements.filter(isNamedRadio);
  if (radios.length === 0) return elements;
  const isGroupRepresentative = (radio: HTMLInputElement) => {
    const group = radios.filter((other) => other.name === radio.name && other.form === radio.form);
    return (group.find((other) => other.checked) ?? group[0]) === radio;
  };
  return elements.filter((element) => !isNamedRadio(element) || isGroupRepresentative(element));
}
