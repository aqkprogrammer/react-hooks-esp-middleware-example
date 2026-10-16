import { useInsertionEffect } from 'react';

/**
 * A deliberately tiny CSS-in-JS runtime used to illustrate
 * `useInsertionEffect`. Real libraries (Emotion, styled-components, …) add
 * vendor prefixing, SSR extraction, nesting and much more.
 */

interface Entry {
  element: HTMLStyleElement;
  refs: number;
}

const registry = new Map<string, Entry>();

/** Small, stable string hash (djb2) rendered in base 36. */
export function hashCss(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** The class name and full rule for a declaration block. Pure — safe in render. */
export function scopedRule(declarations: string): { className: string; rule: string } {
  const className = `scoped-${hashCss(declarations)}`;
  return { className, rule: `.${className} { ${declarations} }` };
}

/**
 * Injects `.scoped-<hash> { declarations }` into `<head>` and returns the
 * class name. Identical declarations share one `<style>` tag (ref-counted);
 * the tag is removed when the last user unmounts.
 *
 * `useInsertionEffect` runs before React mutates the DOM and before any
 * layout effect, so the rule exists by the time layout effects measure the
 * styled elements. It cannot update state and refs are not attached yet.
 */
export function useScopedCss(declarations: string): string {
  const { className, rule } = scopedRule(declarations);
  useInsertionEffect(() => {
    let entry = registry.get(className);
    if (!entry) {
      const element = document.createElement('style');
      element.setAttribute('data-scoped-css', className);
      element.textContent = rule;
      document.head.appendChild(element);
      entry = { element, refs: 0 };
      registry.set(className, entry);
    }
    const current = entry;
    current.refs += 1;
    return () => {
      current.refs -= 1;
      if (current.refs === 0) {
        current.element.remove();
        registry.delete(className);
      }
    };
  }, [className, rule]);
  return className;
}
