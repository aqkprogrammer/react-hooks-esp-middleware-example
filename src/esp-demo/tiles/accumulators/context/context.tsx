import { createContext, use, useMemo, type ReactNode } from 'react';
import { useEspReducer, type EspStoreHandle } from '../../../../middleware/esp-js';
import type { Dispatch } from '../../../../middleware/reducer/types';
import { useEspTrace } from '../../../trace';
import { createActions, type AccumulatorsActions } from './actions';
import { initialState, reducer, type AccumulatorsState } from './reducers';
import { types, type AccumulatorsAction, type AccumulatorsOwnAction } from './types';

export interface AccumulatorsContextValue {
  state: AccumulatorsState;
  dispatch: Dispatch<AccumulatorsAction>;
  actions: AccumulatorsActions;
  esp: EspStoreHandle;
}

export const AccumulatorsContext = createContext<AccumulatorsContextValue | null>(null);

export function useAccumulators(): AccumulatorsContextValue {
  const value = use(AccumulatorsContext);
  if (!value) throw new Error('useAccumulators must be used inside <AccumulatorsProvider>');
  return value;
}

export const AccumulatorsProvider = ({ children }: { children: ReactNode }) => {
  const trace = useEspTrace();
  const [state, dispatch, esp] = useEspReducer<AccumulatorsState, AccumulatorsOwnAction>(
    reducer,
    initialState,
    {
      modelName: 'accumulators',
      observedEvents: [types.common.KEY_PRESSED],
      ...(trace ? { onStage: trace } : {}),
    },
  );
  const actions = useMemo(() => createActions(dispatch), [dispatch]);
  const value = useMemo(() => ({ state, dispatch, actions, esp }), [state, dispatch, actions, esp]);
  return <AccumulatorsContext value={value}>{children}</AccumulatorsContext>;
};
