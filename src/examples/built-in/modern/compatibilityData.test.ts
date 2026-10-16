import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { catalog } from '../../../catalog';
import { compatibility, compatibilityGroups, type ModuleName } from './compatibilityData';

const modules: Record<ModuleName, object> = {
  react: React,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
};

const exported = compatibility.filter((row) => row.module && row.exportName);

describe('compatibilityData', () => {
  it('is checked against React 19.3', () => {
    expect(React.version.startsWith('19.3.')).toBe(true);
    expect(ReactDOM.version).toBe(React.version);
  });

  it.each(
    exported.filter((row) => row.status !== 'removed').map((row) => [row.name, row] as const),
  )('%s is exported by the installed build', (_name, row) => {
    expect(Object.keys(modules[row.module as ModuleName])).toContain(row.exportName);
  });

  it.each(
    exported.filter((row) => row.status === 'removed').map((row) => [row.name, row] as const),
  )('%s is really gone from the installed build', (_name, row) => {
    expect(Object.keys(modules[row.module as ModuleName])).not.toContain(row.exportName);
  });

  it('uses known groups, unique names and valid versions', () => {
    const groupIds = new Set(compatibilityGroups.map((group) => group.id));
    const names = compatibility.map((row) => row.name);
    expect(new Set(names).size).toBe(names.length);
    for (const row of compatibility) {
      expect(groupIds.has(row.group)).toBe(true);
      expect(row.minVersion).toMatch(/^\d+\.\d+$/);
    }
    for (const group of compatibilityGroups) {
      expect(compatibility.some((row) => row.group === group.id)).toBe(true);
    }
  });

  it('only links to catalog entries that exist', () => {
    const ids = new Set(catalog.map((entry) => entry.id));
    for (const row of compatibility) {
      if (row.demo) expect(ids.has(row.demo), `${row.name} → ${row.demo}`).toBe(true);
    }
  });
});
