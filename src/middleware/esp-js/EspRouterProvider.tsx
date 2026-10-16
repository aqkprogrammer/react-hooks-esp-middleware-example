import type { ReactNode } from 'react';
import type { Router } from 'esp-js';
import { EspRouterContext } from './EspRouterContext';

/** Scopes a router to a subtree (one workspace, one test, one demo). */
export function EspRouterProvider({ router, children }: { router: Router; children: ReactNode }) {
  return <EspRouterContext value={router}>{children}</EspRouterContext>;
}
