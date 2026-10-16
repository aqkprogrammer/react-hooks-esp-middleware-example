import reactHooks from 'eslint-plugin-react-hooks';
import { describe, expect, it } from 'vitest';
import { lintRules } from './lintRules';

describe('lintRules', () => {
  it('matches the installed recommended-latest preset (names and severities)', () => {
    const preset = reactHooks.configs['recommended-latest'].rules as Record<string, string>;
    const fromPlugin = Object.entries(preset)
      .map(([name, severity]) => [name.replace('react-hooks/', ''), severity])
      .sort();
    const documented = lintRules.map((rule) => [rule.name, rule.severity]).sort();
    expect(documented).toEqual(fromPlugin);
  });

  it('marks only the two classic rules as not compiler-powered', () => {
    expect(lintRules.filter((rule) => !rule.compilerPowered).map((rule) => rule.name)).toEqual([
      'rules-of-hooks',
      'exhaustive-deps',
    ]);
  });

  it('links to react.dev', () => {
    for (const rule of lintRules) expect(rule.docs).toMatch(/^https:\/\/react\.dev\//);
  });
});
