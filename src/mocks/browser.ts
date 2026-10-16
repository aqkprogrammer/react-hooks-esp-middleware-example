import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/**
 * Starts the mock API Service Worker. The playground has no real backend:
 * every `/api/*` request, the demo WebSocket and the SSE stream are served by
 * MSW in the browser. Requests outside `/api` pass through untouched.
 */
export async function startMockApi(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[mock api] Service Workers are unavailable; network demos will fail.');
    return;
  }
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}
