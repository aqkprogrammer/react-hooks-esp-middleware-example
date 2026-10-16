import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

/** In-process MSW server shared by every test (see ./setup.ts). */
export const server = setupServer(...handlers);
