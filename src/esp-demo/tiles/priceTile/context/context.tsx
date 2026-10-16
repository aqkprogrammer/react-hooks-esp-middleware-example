import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEspReducer } from '../../../../middleware/esp-js';
import type { Dispatch } from '../../../../middleware/reducer/types';
import { createStreamMiddleware } from '../../../common/middleware/streamMiddleware';
import { createCcyPairPriceService } from '../../../common/services/ccyPairPriceService';
import { useEspTrace } from '../../../trace';
import { createActions, type PriceActions } from './actions';
import { initialState, reducer, type PriceState } from './reducers';
import { createPriceStreamHandlerMap } from './stream';
import { types, type PriceAction, type PriceOwnAction } from './types';

export interface PriceContextValue {
  state: PriceState;
  dispatch: Dispatch<PriceAction>;
  actions: PriceActions;
}

export const PriceContext = createContext<PriceContextValue | null>(null);

export function usePriceTile(): PriceContextValue {
  const value = use(PriceContext);
  if (!value) throw new Error('usePriceTile must be used inside <PriceTileProvider>');
  return value;
}

export const PriceTileProvider = ({
  children,
  tickMs = 2000,
}: {
  children: ReactNode;
  /** Price tick interval (tests use a shorter one). */
  tickMs?: number;
}) => {
  const trace = useEspTrace();
  // One price service + stream middleware per tile instance.
  const [streams] = useState(() =>
    createStreamMiddleware<PriceState, PriceAction>(
      createPriceStreamHandlerMap(createCcyPairPriceService(tickMs)),
      {
        cancelAllActionType: types.UNSUBSCRIBE_ALL_PRICES,
        toError: (error) => ({ type: types.stream.ERROR, payload: String(error) }),
      },
    ),
  );
  // Note the middleware are chained together: streams → esp → reducer.
  const [state, dispatch] = useEspReducer<PriceState, PriceOwnAction>(reducer, initialState, {
    modelName: 'price-tile',
    observedEvents: [types.common.KEY_PRESSED],
    middleware: [streams.middleware],
    ...(trace ? { onStage: trace } : {}),
  });

  // Stop every price stream when the tile unmounts.
  useEffect(() => streams.dispose, [streams]);

  const actions = useMemo(() => createActions(dispatch), [dispatch]);
  const value = useMemo(() => ({ state, dispatch, actions }), [state, dispatch, actions]);
  return <PriceContext value={value}>{children}</PriceContext>;
};
