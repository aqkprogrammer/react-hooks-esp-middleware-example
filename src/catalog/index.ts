/**
 * Aggregates every catalog entry. Explicit imports (rather than
 * import.meta.glob) keep this module loadable by the Node docs generator.
 */
import type { CatalogEntry, Section } from './types';
import { entries as builtInState } from './entries/built-in-state';
import { entries as builtInEffects } from './entries/built-in-effects';
import { entries as builtInRefs } from './entries/built-in-refs';
import { entries as builtInPerformance } from './entries/built-in-performance';
import { entries as builtInModern } from './entries/built-in-modern';
import { entries as rulesAndAntiPatterns } from './entries/rules-and-anti-patterns';
import { entries as customState } from './entries/custom-state';
import { entries as customTiming } from './entries/custom-timing';
import { entries as customBrowser } from './entries/custom-browser';
import { entries as customStorage } from './entries/custom-storage';
import { entries as customAsync } from './entries/custom-async';
import { entries as customForms } from './entries/custom-forms';
import { entries as customAccessibility } from './entries/custom-accessibility';
import { entries as customDevice } from './entries/custom-device';
import { entries as customAdvanced } from './entries/custom-advanced';
import { entries as stateManagement } from './entries/state-management';
import { entries as esp } from './entries/esp';
import { entries as scenariosCore } from './entries/scenarios-core';
import { entries as scenariosAdvanced } from './entries/scenarios-advanced';
import { entries as testing } from './entries/testing';

export const catalog: readonly CatalogEntry[] = [
  ...builtInState,
  ...builtInEffects,
  ...builtInRefs,
  ...builtInPerformance,
  ...builtInModern,
  ...rulesAndAntiPatterns,
  ...customState,
  ...customTiming,
  ...customBrowser,
  ...customStorage,
  ...customAsync,
  ...customForms,
  ...customAccessibility,
  ...customDevice,
  ...customAdvanced,
  ...stateManagement,
  ...esp,
  ...scenariosCore,
  ...scenariosAdvanced,
  ...testing,
];

const byId = new Map(catalog.map((entry) => [entry.id, entry]));

export function getEntry(id: string): CatalogEntry | undefined {
  return byId.get(id);
}

export const sectionLabels: Record<Section, string> = {
  'built-in': 'Built-in Hooks',
  custom: 'Custom Hooks',
  scenario: 'Real-World Scenarios',
  state: 'State Management & Middleware',
  esp: 'ESP-JS Integration',
  testing: 'Testing',
  'anti-pattern': 'Rules & Anti-patterns',
};

export const sectionOrder: readonly Section[] = [
  'built-in',
  'custom',
  'scenario',
  'state',
  'esp',
  'testing',
  'anti-pattern',
];

export * from './types';
