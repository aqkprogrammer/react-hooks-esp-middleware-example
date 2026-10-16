import { createContext } from 'react';
import type { Router } from 'esp-js';
import { espRouter } from './router';

/** Defaults to the shared workspace router so existing code works without a provider. */
export const EspRouterContext = createContext<Router>(espRouter);
