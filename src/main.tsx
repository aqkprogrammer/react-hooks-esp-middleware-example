import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startMockApi } from './mocks/browser';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

// The root is intentionally *not* wrapped in <StrictMode>: each live demo has
// its own Strict Mode toggle so you can compare effect behaviour with and
// without React's development double-invocation.
startMockApi()
  .catch((error: unknown) => console.error('[mock api] failed to start', error))
  .finally(() => {
    createRoot(container).render(<App />);
  });
