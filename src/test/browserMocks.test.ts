import { describe, expect, it } from 'vitest';
import { overrideProperty, restoreOverriddenProperties, setOnline } from './browserMocks';

describe('overrideProperty', () => {
  it('restores the original value regardless of restore order', () => {
    const original = navigator.onLine;
    const restoreFirst = setOnline(!original);
    const restoreSecond = setOnline(original);
    restoreFirst();
    restoreSecond();
    expect(navigator.onLine).toBe(original);
    expect(Object.getOwnPropertyDescriptor(navigator, 'onLine')).toBeUndefined();
  });

  it('restores everything still overridden', () => {
    overrideProperty(document, 'visibilityState', 'hidden');
    expect(document.visibilityState).toBe('hidden');
    restoreOverriddenProperties();
    expect(document.visibilityState).toBe('visible');
  });
});
