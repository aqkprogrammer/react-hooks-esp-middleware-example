import { use } from 'react';
import type { Router } from 'esp-js';
import { EspRouterContext } from './EspRouterContext';

/** The nearest router from `<EspRouterProvider>`, or the shared workspace router. */
export function useEspRouter(): Router {
  return use(EspRouterContext);
}
