import { Router } from 'esp-js';

/**
 * The shared "workspace / shell" router from the original example. Tiles in
 * the same workspace communicate through it. Tests and isolated demos should
 * create their own `new Router()` and provide it with `<EspRouterProvider>`.
 */
export const espRouter = new Router();
