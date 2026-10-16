/**
 * Guards the catalog against drift: every entry must point at files that
 * exist, reference related entries that exist, and every public custom hook
 * must be documented by exactly one catalog entry.
 */
/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as hooks from '../hooks';
import { catalog } from './index';

// Vitest runs from the project root (jsdom's import.meta.url is not a file: URL).
const srcDir = resolve(process.cwd(), 'src');
const fileExists = (relative: string) => existsSync(resolve(srcDir, relative));

describe('catalog integrity', () => {
  it('has unique, kebab-case ids', () => {
    const ids = catalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(catalog.map((entry) => [entry.id, entry] as const))(
    '%s points at existing files',
    (_id, entry) => {
      const files = [...entry.sources, ...(entry.tests ?? []), ...(entry.demo ? [entry.demo] : [])];
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(fileExists(file), `${entry.id}: missing ${file}`).toBe(true);
      }
    },
  );

  it('demos default-export a component', () => {
    for (const entry of catalog) {
      if (!entry.demo) continue;
      const source = readFileSync(resolve(srcDir, entry.demo), 'utf8');
      expect(source, `${entry.id}: ${entry.demo} needs a default export`).toMatch(
        /export default /,
      );
    }
  });

  it('only relates to entries that exist', () => {
    const ids = new Set(catalog.map((entry) => entry.id));
    for (const entry of catalog) {
      for (const related of entry.related ?? []) {
        expect(ids.has(related), `${entry.id} → unknown related id "${related}"`).toBe(true);
      }
    }
  });

  it('documents every exported custom hook exactly once', () => {
    const exportedHooks = Object.keys(hooks).filter((name) => /^use[A-Z]/.test(name));
    const documented = catalog
      .filter((entry) => entry.section === 'custom')
      .flatMap((entry) => entry.title.split(/\s*[,/]\s*/));
    for (const name of exportedHooks) {
      expect(documented, `${name} has no catalog entry`).toContain(name);
    }
    const duplicates = documented.filter((name, index) => documented.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
  });

  it('custom hook entries include an API reference and tests', () => {
    for (const entry of catalog.filter((item) => item.section === 'custom')) {
      expect(entry.api?.signature, `${entry.id} needs api.signature`).toBeTruthy();
      expect(entry.tests?.length ?? 0, `${entry.id} needs tests`).toBeGreaterThan(0);
    }
  });

  it('uses https links for official docs', () => {
    for (const entry of catalog) {
      for (const link of entry.officialDocs ?? []) expect(link.url).toMatch(/^https:\/\//);
    }
  });
});
