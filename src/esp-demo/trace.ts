import { createContext, use } from 'react';
import type { EspStageInfo } from '../middleware/esp-js';

/** Lets every provider in the demo report esp-js stages to the inspector panel. */
export const EspTraceContext = createContext<((info: EspStageInfo) => void) | undefined>(undefined);

export function useEspTrace() {
  return use(EspTraceContext);
}
