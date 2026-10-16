/**
 * Web Worker entry for UseWebWorkerDemo. Vite bundles it because the demo
 * creates it with `new Worker(new URL('./primes.worker.ts', import.meta.url), { type: 'module' })`.
 */
import { handlePrimesRequest, type PrimesRequest, type PrimesResponse } from './primes';

const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<PrimesRequest>) => void): void;
  postMessage(message: PrimesResponse): void;
};

scope.addEventListener('message', (event) => {
  handlePrimesRequest(event.data, (response) => scope.postMessage(response));
});
