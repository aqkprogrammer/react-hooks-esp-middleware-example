import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetMockDb } from '../mocks/handlers';
import { restoreOverriddenProperties } from './browserMocks';
import { server } from './server';

// Node's fetch (undici) rejects relative URLs, while browsers resolve them
// against the page. Resolve them against jsdom's location so demo code can use
// `fetch('/api/...')` exactly as it does in the browser.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return nativeFetch(new URL(input, window.location.origin), init);
  }
  return nativeFetch(input, init);
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  restoreOverriddenProperties();
  server.resetHandlers();
  resetMockDb();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterAll(() => server.close());
